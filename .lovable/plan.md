
# Fix: Deploy Button "Waiting for wallet" Issue

## Problem Analysis

The deploy page shows the wallet as connected (address visible, network showing "Polygon Mainnet") but the button remains stuck on "Waiting for wallet...". This occurs because:

1. **`useWalletClient()` returns `undefined` during loading**: Even when the wallet is connected, the `walletClient` data may be `undefined` while the hook is fetching/initializing
2. **Missing loading state check**: The current code only checks `!!walletClient` but doesn't check if the hook is still in a loading/pending state
3. **`usePublicClient()` may also return `undefined`**: Similar timing issue can occur with the public client

## Solution

### Approach 1: Use loading states from wagmi hooks (Recommended - Quick Fix)

Use the `isLoading` or `isPending` states from `useWalletClient()` to distinguish between "still loading" and "actually unavailable":

```typescript
const { data: walletClient, isLoading: walletClientLoading } = useWalletClient();

// If connected but still fetching wallet client, show appropriate state
const isWalletReady = isConnected && !!walletClient && !!publicClient && !walletClientLoading;
```

### Approach 2: Use wagmi's native `useDeployContract` hook (Better long-term)

Wagmi v2 provides a dedicated `useDeployContract` hook that handles wallet client internally and provides a cleaner API:

```typescript
import { useDeployContract } from 'wagmi';

const { deployContract, isPending, isSuccess, data: hash } = useDeployContract();

// Then use:
deployContract({
  abi: CARE_COIN_ABI,
  bytecode: CARE_COIN_BYTECODE,
  args: [TREASURY_ADDRESS, supplyWei],
});
```

This eliminates the need to manually manage `walletClient` and `publicClient`.

---

## Implementation Plan

### Step 1: Fix the `isWalletReady` calculation
- Extract `isLoading` (or `isPending`) from `useWalletClient()` hook
- Update `isWalletReady` to account for loading state
- Show "Initializing..." when connected but wallet client is still loading

### Step 2: Improve button text feedback
- Show different states:
  - **Not connected**: "Connect Wallet"
  - **Connected but loading**: "Initializing..."
  - **Ready**: "Deploy CareCoin"

### Step 3: (Optional Enhancement) Migrate to `useDeployContract`
- Replace manual `sendTransaction` approach with wagmi's `useDeployContract` hook
- This provides better error handling and state management out of the box

---

## Technical Details

### File to modify:
- `src/pages/admin/DeployContract.tsx`

### Key changes:

```typescript
// Before
const { data: walletClient } = useWalletClient();
const isWalletReady = isConnected && !!walletClient && !!publicClient;

// After
const { data: walletClient, isLoading: walletClientLoading } = useWalletClient();
const isWalletReady = isConnected && !!walletClient && !!publicClient;
const isInitializing = isConnected && walletClientLoading;

// Button logic
{isInitializing ? 'Initializing...' : !isWalletReady ? 'Connect Wallet' : 'Deploy CareCoin'}
```

This approach properly handles the race condition where the UI shows "connected" but the wallet client hook hasn't resolved yet.
