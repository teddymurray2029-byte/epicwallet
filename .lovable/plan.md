

# Automate CARE→USD via Uniswap API + Stripe Virtual Card Funding

## Overview

Replace the hardcoded `$0.01` conversion rate with real Uniswap swaps on Polygon. When a provider converts CARE to load their virtual card, the system will:

1. **Quote** the swap price from Uniswap on-chain
2. **Execute** the swap (CARE→USDC) as an on-chain transaction signed by the provider's wallet
3. **Detect** the USDC received and update the Stripe virtual card balance accordingly

## Prerequisites

A CARE/USDC liquidity pool **must exist on Uniswap V3 on Polygon** before any of this works. Without a pool, there is nothing for the API to swap against. If no pool exists yet, the system will show a clear message explaining this.

## Architecture

```text
Provider Wallet (has CARE tokens)
        │
        ▼
[1] Frontend fetches quote from care-price edge function
        │
        ▼
[2] Provider approves CARE spend → SwapRouter on-chain
        │
        ▼
[3] Provider executes swap tx (CARE → USDC) via wagmi
        │
        ▼
[4] Frontend sends USDC to platform treasury wallet
        │
        ▼
[5] Edge function verifies on-chain tx, credits USD to Stripe card
```

## Changes

### 1. New edge function: `supabase/functions/care-price/index.ts`
- Calls the Uniswap V3 Quoter V2 contract on Polygon via RPC to get a real-time CARE→USDC quote
- Accepts `care_amount` parameter, returns `usdc_amount`, `price_per_care`, and `price_impact`
- Uses the Polygon public RPC (no API key needed)
- Contract addresses: Quoter V2 (`0x61fFE014bA17989E743c5F6cB21bF9697530B21e`), CARE, USDC

### 2. New hook: `src/hooks/useUniswapSwap.ts`
- `getQuote(careAmount)`: calls the `care-price` edge function for live pricing
- `executeSwap(careAmount)`: orchestrates the two on-chain transactions via wagmi:
  1. `approve()` — approve Uniswap SwapRouter to spend CARE tokens
  2. `exactInputSingle()` — execute the swap on SwapRouter (`0xE592427A0AEce92De3Edee1F18E0157C05861564`)
- Returns USDC received amount for the next step

### 3. Update `src/lib/wagmi.ts`
- Add Uniswap contract addresses (SwapRouter, Quoter V2) to `CONTRACT_ADDRESSES`
- Add SwapRouter ABI (just `exactInputSingle`) and ERC-20 `approve` (already present)

### 4. Update `src/pages/provider/VirtualCard.tsx`
- Replace `const [usdRate] = useState(0.01)` with live quote from `useUniswapSwap`
- Show real-time USDC estimate as user types conversion amount
- Conversion flow becomes:
  1. Fetch quote → display estimated USDC output + price impact
  2. User clicks "Convert" → approve tx → swap tx (both signed in wallet)
  3. After swap confirms, call `virtual-card` edge function to credit the USD balance
- Show "Powered by Uniswap" badge and the live rate

### 5. Update `supabase/functions/virtual-card/index.ts`
- Update `handleConvert` to accept a `tx_hash` parameter (the Uniswap swap transaction)
- Verify the swap happened on-chain by reading the tx receipt via RPC
- Extract the actual USDC amount received from the swap event logs
- Credit the verified USD amount to the card balance (not a calculated amount)
- This prevents manipulation — the backend only credits what was actually swapped

### 6. Update `src/pages/provider/FiatOfframp.tsx`
- Replace hardcoded `usdRate = 0.01` with live Uniswap price
- Show the real market rate on the balance overview

## Security Considerations
- The backend **verifies the swap tx on-chain** before crediting USD — providers cannot fake amounts
- Slippage protection: default 1% slippage tolerance, configurable by provider
- If no Uniswap pool exists, the UI shows an informational message instead of failing silently

## What this does NOT require
- No API keys (Uniswap is permissionless, quotes use public RPC)
- No Uniswap account or registration
- No backend wallet or signing — the provider signs everything in their own wallet

