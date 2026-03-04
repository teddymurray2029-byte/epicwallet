import { useState, useCallback } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_ADDRESSES, CARE_COIN_ABI } from '@/lib/wagmi';
import { polygon } from 'wagmi/chains';

export type RedemptionStep = 'idle' | 'burning' | 'confirming' | 'done' | 'error';

export interface RedemptionRate {
  rate: number;
  care_amount: number;
  usd_amount: number;
}

export function useCareRedemption() {
  const [rate, setRate] = useState<RedemptionRate | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [step, setStep] = useState<RedemptionStep>('idle');
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  const getRate = useCallback(async (careAmount: number): Promise<RedemptionRate | null> => {
    setRateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('care-price', {
        body: { care_amount: careAmount },
      });
      if (error) throw error;
      setRate(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch rate:', err);
      return null;
    } finally {
      setRateLoading(false);
    }
  }, []);

  const executeRedemption = useCallback(async (
    careAmount: number,
  ): Promise<{ txHash: string } | null> => {
    try {
      setStep('burning');
      const amountWei = parseUnits(String(careAmount), 18);

      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES[polygon.id].careCoin as `0x${string}`,
        abi: CARE_COIN_ABI,
        functionName: 'burn',
        args: [amountWei],
        chain: polygon,
        account: address,
      });

      setStep('confirming');
      await new Promise((r) => setTimeout(r, 5000));

      setStep('done');
      return { txHash };
    } catch (err: any) {
      console.error('Burn failed:', err);
      setStep('error');
      throw err;
    }
  }, [writeContractAsync, address]);

  const resetStep = useCallback(() => setStep('idle'), []);

  return {
    rate,
    rateLoading,
    getRate,
    executeRedemption,
    step,
    resetStep,
  };
}
