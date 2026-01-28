

# Fix Wagmi "Chain not configured" Error for Contract Deployment

## Problem Summary
The `useDeployContract` hook from wagmi v3 validates the current chain against its internal configuration. When switching networks via `window.ethereum`, wagmi's state may lag behind, causing the "Chain not configured" error during deployment even when the wallet is correctly on Polygon Amoy.

## Solution Overview
Bypass wagmi's `useDeployContract` hook entirely and use `viem` directly with a wallet client obtained from the connected wallet. This gives us full control over the deployment without wagmi's chain validation.

---

## Implementation Steps

### 1. Update Deployment Logic to Use Viem Directly
Replace the wagmi `useDeployContract` hook with a direct viem deployment using `walletClient.deployContract()`.

**File:** `src/pages/admin/DeployContract.tsx`

**Changes:**
- Import `createWalletClient`, `custom`, and `getContractAddress` from viem
- Remove `useDeployContract` hook
- Create a wallet client directly from `window.ethereum` when deploying
- Use `walletClient.deployContract()` which doesn't have wagmi's chain restrictions
- Manually compute contract address from transaction receipt

### 2. Add Chain Objects for Viem
Ensure proper chain configurations are available for viem's wallet client.

**Key Code Pattern:**
```typescript
// Create wallet client directly from window.ethereum
const walletClient = createWalletClient({
  account: address,
  chain: chainId === polygonAmoy.id ? polygonAmoy : polygon,
  transport: custom(window.ethereum),
});

// Deploy using viem directly
const hash = await walletClient.deployContract({
  abi: CARE_COIN_ABI,
  bytecode: CARE_COIN_BYTECODE,
  args: [TREASURY_ADDRESS, supplyWei],
});
```

### 3. Track Transaction Receipt
Use wagmi's `useWaitForTransactionReceipt` (which still works) or viem's `waitForTransactionReceipt` to get the deployed contract address.

---

## Technical Details

### Why This Works
- `viem` is the underlying library wagmi uses
- Connecting directly to `window.ethereum` bypasses wagmi's chain registry validation
- The wallet already has the correct chain configured (from our network switcher)
- Transaction signing happens through MetaMask which knows the correct chain

### Files to Modify
1. `src/pages/admin/DeployContract.tsx` - Replace deployment logic

### Risk Assessment
- **Low risk**: Viem is wagmi's underlying library, so we're using tested, stable code
- This is a common pattern when wagmi hooks don't fit the use case

---

## Testing Instructions
After implementation:
1. Navigate to `/admin/deploy`
2. Connect MetaMask wallet
3. Use the network dropdown to select "Polygon Amoy (Testnet)"
4. Ensure you have testnet POL (get from [Polygon Faucet](https://faucet.polygon.technology/))
5. Click "Deploy CareCoin"
6. Confirm the transaction in MetaMask

