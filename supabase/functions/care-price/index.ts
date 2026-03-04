import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Uniswap V3 Quoter V2 on Polygon
const QUOTER_V2 = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const CARE_TOKEN = '0xac9f5c0ae3964bec937179a295bd45d977cf5655';
const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_RPC = 'https://polygon-bor-rpc.publicnode.com';
const POOL_FEE = 10000; // 1% fee tier

// quoteExactInputSingle((address,address,uint256,uint24,uint160)) => (uint256,uint160,uint32,uint256)
const QUOTE_SELECTOR = '0xc6a5026a';

function encodePath(tokenIn: string, fee: number, tokenOut: string): string {
  const feeHex = fee.toString(16).padStart(6, '0');
  return tokenIn.toLowerCase().slice(2) + feeHex + tokenOut.toLowerCase().slice(2);
}

function encodeQuoteCall(careAmount: bigint): string {
  // quoteExactInputSingle struct: (tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96)
  const tokenIn = CARE_TOKEN.slice(2).toLowerCase().padStart(64, '0');
  const tokenOut = USDC_POLYGON.slice(2).toLowerCase().padStart(64, '0');
  const amountIn = careAmount.toString(16).padStart(64, '0');
  const fee = POOL_FEE.toString(16).padStart(64, '0');
  const sqrtPriceLimit = '0'.padStart(64, '0'); // no limit

  // Encode as tuple: offset(0x20) + struct fields
  const offset = '0000000000000000000000000000000000000000000000000000000000000020';
  return QUOTE_SELECTOR + offset + tokenIn + tokenOut + amountIn + fee + sqrtPriceLimit;
}

async function rpcCall(data: string, to: string): Promise<string> {
  const res = await fetch(POLYGON_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { care_amount } = await req.json();
    if (!care_amount || care_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid care_amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert to wei (18 decimals)
    const careWei = BigInt(Math.floor(care_amount * 1e18));

    const callData = encodeQuoteCall(careWei);

    let usdcOut: bigint;
    try {
      const result = await rpcCall(callData, QUOTER_V2);
      // First 32 bytes = amountOut
      usdcOut = BigInt('0x' + result.slice(2, 66));
    } catch (err) {
      // Pool likely doesn't exist
      return new Response(JSON.stringify({
        error: 'No liquidity pool found for CARE/USDC. A Uniswap V3 pool must be created first.',
        pool_exists: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // USDC has 6 decimals
    const usdcAmount = Number(usdcOut) / 1e6;
    const pricePerCare = usdcAmount / care_amount;

    // Simple price impact estimate: compare with a 1 CARE quote
    let priceImpact = 0;
    if (care_amount > 1) {
      try {
        const smallCallData = encodeQuoteCall(BigInt(1e18));
        const smallResult = await rpcCall(smallCallData, QUOTER_V2);
        const smallUsdcOut = Number(BigInt('0x' + smallResult.slice(2, 66))) / 1e6;
        if (smallUsdcOut > 0) {
          priceImpact = ((smallUsdcOut - pricePerCare) / smallUsdcOut) * 100;
        }
      } catch { /* ignore — just skip impact calc */ }
    }

    return new Response(JSON.stringify({
      pool_exists: true,
      care_amount,
      usdc_amount: usdcAmount,
      price_per_care: pricePerCare,
      price_impact: Math.max(0, priceImpact),
      fee_tier: POOL_FEE / 10000,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('care-price error:', err);
    return new Response(JSON.stringify({ error: String(err).slice(0, 200) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
