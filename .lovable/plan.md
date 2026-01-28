
# CareCoin Launch Plan

## Current Status
✅ Off-chain rewards tracking via `rewards_ledger` table  
✅ 10% network fee implemented  
✅ UI shows "Earned Rewards" (off-chain) vs "On-Chain Balance"  
⏳ ERC-20 contract deployment pending  

---

# Part 1: Launching CareCoin ERC-20 Token

## Prerequisites
1. **Wallet with POL/MATIC** for gas fees
2. **Remix IDE** or Hardhat for deployment
3. **Polygonscan account** for contract verification

## Step 1: Deploy CareCoin ERC-20 Contract

### Option A: Use Remix IDE (Easiest)

1. Go to https://remix.ethereum.org
2. Create new file `CareCoin.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CareCoin is ERC20, Ownable {
    // Treasury wallet that holds unminted supply
    address public treasury;
    
    // Maximum supply: 1 billion CARE tokens
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    constructor(address _treasury) ERC20("CareCoin", "CARE") Ownable(msg.sender) {
        treasury = _treasury;
        // Mint initial supply to treasury
        _mint(_treasury, MAX_SUPPLY);
    }
    
    // Treasury can mint rewards to recipients (up to MAX_SUPPLY)
    function mintReward(address recipient, uint256 amount) external {
        require(msg.sender == treasury || msg.sender == owner(), "Not authorized");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(recipient, amount);
    }
    
    // Update treasury address
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
```

3. Compile with Solidity 0.8.20+
4. Deploy to **Polygon Amoy** (testnet first):
   - Network: Polygon Amoy Testnet
   - RPC: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Treasury address: `0xbb1b796e3781ed0f4d36e3a4272653e6f496ce37`

5. **Save the deployed contract address!**

## Step 2: Update App Configuration

After deployment, update `src/lib/wagmi.ts`:

```typescript
export const CONTRACT_ADDRESSES = {
  [polygon.id]: {
    careCoin: '0x...', // Mainnet address (deploy later)
    // ...
  },
  [polygonAmoy.id]: {
    careCoin: '0xYOUR_DEPLOYED_ADDRESS', // ← Update this!
    // ...
  },
} as const;
```

## Step 3: Verify Contract on Polygonscan

1. Go to https://amoy.polygonscan.com/address/YOUR_CONTRACT
2. Click "Verify and Publish"
3. Select "Solidity (Single file)"
4. Paste contract code and constructor args

## Step 4: Test the Integration

1. Connect wallet to the app
2. On-Chain Balance should now read from the deployed contract
3. Check Polygonscan to verify token appears

---

# Part 2: Network Fee Implementation (Already Done)

## Overview
10% of every reward goes to the network fee wallet before distribution.

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
