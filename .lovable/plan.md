

# Plan: Platform-Backed CARE Redemption (Burn-to-Credit)

Replace Uniswap swap logic with a simpler burn-to-credit model. Providers burn CARE on-chain, backend verifies the burn, and credits USD to their Stripe card at a platform-set rate.

## Changes

### 1. Add `burn` to ABI in `src/lib/wagmi.ts`
- Add `burn(uint256)` function entry to `CARE_COIN_ABI`
- Remove `UNISWAP_ADDRESSES` and `SWAP_ROUTER_ABI` exports

### 2. Create `src/hooks/useCareRedemption.ts` (replaces `useUniswapSwap.ts`)
- `getRate()`: calls `care-price` edge function, returns `{ rate, care_amount, usd_amount }`
- `executeRedemption(amount)`: calls `burn(amount)` on CareCoin contract via wagmi `writeContractAsync`, waits for receipt, returns `{ txHash, careAmountBurned }`
- Tracks step state: `idle → burning → confirming → done → error`

### 3. Rewrite `supabase/functions/care-price/index.ts`
- Remove all Uniswap Quoter RPC logic
- Fetch rate from `system_settings` table (key: `care_usd_rate`)
- If not found, default to `0.01`
- Return `{ rate, care_amount, usd_amount }` (simple multiplication)

### 4. Update `supabase/functions/virtual-card/index.ts` `handleConvert`
- Change on-chain verification from Uniswap swap detection to **burn detection**
- Look for `Transfer` event where `to` topic is the zero address (`0x0000...0000`)
- Extract CARE amount burned from event data (18 decimals)
- Fetch platform rate from `system_settings`
- Calculate USD = burned amount × rate, apply 1% fee, credit card balance

### 5. Update `src/pages/provider/VirtualCard.tsx`
- Import `useCareRedemption` instead of `useUniswapSwap`
- Remove `pool_exists` checks, price impact display, "Powered by Uniswap" text
- Show fixed rate: "1 CARE = $0.01 USD"
- Conversion flow: enter amount → burn tx (single wallet sign) → card credited
- Update "How It Works" step 2 description

### 6. Update `src/pages/provider/FiatOfframp.tsx`
- Import `useCareRedemption` instead of `useUniswapSwap`
- Use `rate` from the hook instead of `quote.price_per_care`
- Remove Uniswap V3 label

### 7. Delete `src/hooks/useUniswapSwap.ts`

### 8. Insert default rate into `system_settings`
- SQL: `INSERT INTO system_settings (key, value) VALUES ('care_usd_rate', '{"rate": 0.01}') ON CONFLICT (key) DO NOTHING;`

