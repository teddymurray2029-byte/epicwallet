import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useAccount } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';
import { CARE_COIN_ABI, UNISWAP_ADDRESSES, SWAP_ROUTER_ABI } from '@/lib/wagmi';
import { polygon } from 'wagmi/chains';
import { parseUnits, type Account } from 'viem';

const CARE_TOKEN = '0xac9f5c0ae3964bec937179a295bd45d977cf5655' as const;
const USDC_TOKEN = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const POOL_FEE = 10000; // 1% fee tier

export interface SwapQuote {
  pool_exists: boolean;
  care_amount: number;
  usdc_amount: number;
  price_per_care: number;
  price_impact: number;
  fee_tier: number;
  error?: string;
}

export function useUniswapSwap() {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [swapStep, setSwapStep] = useState<'idle' | 'approving' | 'swapping' | 'confirming' | 'done' | 'error'>('idle');
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: polygon.id });
  const { address: accountAddress } = useAccount();

  const getQuote = useCallback(async (careAmount: number): Promise<SwapQuote | null> => {
    if (careAmount <= 0) { setQuote(null); return null; }
    setQuoteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('care-price', {
        body: { care_amount: careAmount },
      });
      if (error) throw error;
      if (data?.error && !data?.pool_exists) {
        const q: SwapQuote = { pool_exists: false, care_amount: careAmount, usdc_amount: 0, price_per_care: 0, price_impact: 0, fee_tier: 0, error: data.error };
        setQuote(q);
        return q;
      }
      setQuote(data);
      return data;
    } catch (err) {
      console.error('Quote error:', err);
      setQuote(null);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (
    careAmount: number,
    recipientAddress: `0x${string}`,
    slippageBps: number = 100, // 1% default
  ): Promise<{ txHash: string; usdcReceived: number } | null> => {
    if (!publicClient) throw new Error('Public client not available');

    const careWei = parseUnits(careAmount.toString(), 18);
    const swapRouter = UNISWAP_ADDRESSES[polygon.id].swapRouter as `0x${string}`;

    // Step 1: Approve SwapRouter to spend CARE
    setSwapStep('approving');
    try {
      const approveTx = await writeContractAsync({
        account: accountAddress,
        chain: polygon,
        address: CARE_TOKEN,
        abi: CARE_COIN_ABI,
        functionName: 'approve',
        args: [swapRouter, careWei],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
    } catch (err: any) {
      setSwapStep('error');
      throw new Error(`Approval failed: ${err.shortMessage || err.message}`);
    }

    // Step 2: Execute swap
    setSwapStep('swapping');
    try {
      // Get fresh quote for minimum output
      const freshQuote = await getQuote(careAmount);
      if (!freshQuote?.pool_exists || !freshQuote.usdc_amount) {
        throw new Error('No liquidity available');
      }

      const minOut = BigInt(Math.floor(freshQuote.usdc_amount * 1e6 * (1 - slippageBps / 10000)));
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 min

      const swapTx = await writeContractAsync({
        account: accountAddress,
        chain: polygon,
        address: swapRouter,
        abi: SWAP_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [{
          tokenIn: CARE_TOKEN,
          tokenOut: USDC_TOKEN,
          fee: POOL_FEE,
          recipient: recipientAddress,
          deadline,
          amountIn: careWei,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: BigInt(0),
        }],
      });

      setSwapStep('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: swapTx });

      // Parse Transfer event from USDC to get actual amount received
      const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const usdcTransferLog = receipt.logs.find(
        (log: any) =>
          log.address.toLowerCase() === USDC_TOKEN.toLowerCase() &&
          log.topics?.[0] === transferTopic
      );

      let usdcReceived = freshQuote.usdc_amount;
      if (usdcTransferLog?.data) {
        usdcReceived = Number(BigInt(usdcTransferLog.data)) / 1e6;
      }

      setSwapStep('done');
      return { txHash: swapTx, usdcReceived };
    } catch (err: any) {
      setSwapStep('error');
      throw new Error(`Swap failed: ${err.shortMessage || err.message}`);
    }
  }, [writeContractAsync, publicClient, getQuote]);

  const resetSwap = useCallback(() => {
    setSwapStep('idle');
  }, []);

  return {
    quote,
    quoteLoading,
    getQuote,
    executeSwap,
    swapStep,
    resetSwap,
  };
}
