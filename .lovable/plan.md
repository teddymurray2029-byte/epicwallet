
# Add 10% Network Fee to CareCoin

## Overview
This plan adds a 10% network fee to the CareCoin reward system. Whenever rewards are distributed (via Epic webhooks or future payment flows), 10% of the total reward will automatically go to the specified network fee wallet.

**Network Fee Wallet:** `0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37`

---

## How It Will Work

```text
Before (Current):
┌─────────────────────────────────────────┐
│ Base Reward: 10 CARE                    │
│ ├── Provider (60%): 6.0 CARE            │
│ ├── Organization (25%): 2.5 CARE        │
│ └── Patient (15%): 1.5 CARE             │
└─────────────────────────────────────────┘

After (With Network Fee):
┌─────────────────────────────────────────┐
│ Base Reward: 10 CARE                    │
│ ├── Network Fee (10%): 1.0 CARE ← NEW   │
│ └── Remaining (90%): 9.0 CARE           │
│     ├── Provider (60%): 5.4 CARE        │
│     ├── Organization (25%): 2.25 CARE   │
│     └── Patient (15%): 1.35 CARE        │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

### 1. Database Changes

**Add network_fee_percentage to system_settings table:**
- Store the fee configuration as a system setting for easy adjustment
- Key: `network_fee`
- Value: `{ "wallet_address": "0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37", "percentage": 10 }`

**Register the network fee wallet as an entity:**
- Create an entity record for the fee wallet with type `admin` (or a new `network` type)
- This allows tracking rewards in the ledger like any other recipient

### 2. Edge Function Updates (epic-webhook)

**Modify reward calculation logic:**
1. Fetch the `network_fee` setting from `system_settings`
2. Calculate network fee amount: `base_reward × (network_fee_percentage / 100)`
3. Calculate remaining reward: `base_reward - network_fee`
4. Apply provider/org/patient splits to the remaining amount
5. Create a rewards_ledger entry for the network fee wallet

### 3. Display Updates (Optional)

**Update WalletStatusCard and RewardsSummaryCard:**
- Show network fee deductions in transaction history (for transparency)
- Add "Network Fee" as a line item when viewing reward breakdowns

---

## Technical Details

### Database Migration
```sql
-- Insert network fee configuration
INSERT INTO system_settings (key, value)
VALUES ('network_fee', '{"wallet_address": "0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37", "percentage": 10}');

-- Register network fee wallet as entity
INSERT INTO entities (wallet_address, entity_type, display_name, is_verified)
VALUES (
  '0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37',
  'admin',
  'CareCoin Network Treasury',
  true
);
```

### Edge Function Logic Change
```typescript
// Get network fee configuration
const { data: networkFeeSetting } = await supabase
  .from('system_settings')
  .select('value')
  .eq('key', 'network_fee')
  .single();

const networkFee = networkFeeSetting?.value as { wallet_address: string; percentage: number } | null;
const networkFeePercent = networkFee?.percentage || 0;

// Calculate amounts
const networkFeeAmount = (policy.base_reward * networkFeePercent) / 100;
const remainingReward = policy.base_reward - networkFeeAmount;
const providerReward = (remainingReward * policy.provider_split) / 100;

// Create network fee ledger entry
if (networkFee && networkFeeAmount > 0) {
  const { data: networkEntity } = await supabase
    .from('entities')
    .select('id')
    .eq('wallet_address', networkFee.wallet_address.toLowerCase())
    .single();
    
  await supabase.from('rewards_ledger').insert({
    attestation_id: attestation.id,
    recipient_id: networkEntity.id,
    recipient_type: 'admin',
    amount: networkFeeAmount,
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  });
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/*.sql` (new) | Add network fee setting and register wallet entity |
| `supabase/functions/epic-webhook/index.ts` | Add network fee calculation before distributing rewards |

---

## Summary
- **10% of every reward** goes to `0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37`
- Fee is deducted first, then remaining 90% is split per policy
- Configurable via `system_settings` table (easy to adjust later)
- Fee wallet is registered as an entity for proper tracking
- All transactions visible in the rewards ledger for transparency
