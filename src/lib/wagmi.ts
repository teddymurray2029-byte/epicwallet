import { http, createConfig, createStorage } from 'wagmi';
import { polygon, polygonAmoy } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = '3a8170812b534d0ff9d794f19a901d64';

export const config = createConfig({
  chains: [polygon, polygonAmoy],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'CareCoin',
        description: 'Healthcare Rewards Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://carecoin.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
  // Enable storage for connection persistence and auto-reconnect
  storage: createStorage({ storage: typeof window !== 'undefined' ? window.localStorage : undefined }),
});

// Contract addresses (placeholders for deployment)
export const CONTRACT_ADDRESSES = {
  // Polygon Mainnet
  [polygon.id]: {
    careCoin: '0x0000000000000000000000000000000000000000',
    rewardEngine: '0x0000000000000000000000000000000000000000',
    registry: '0x0000000000000000000000000000000000000000',
    treasury: '0x0000000000000000000000000000000000000000',
  },
  // Polygon Amoy Testnet
  [polygonAmoy.id]: {
    careCoin: '0x0000000000000000000000000000000000000000',
    rewardEngine: '0x0000000000000000000000000000000000000000',
    registry: '0x0000000000000000000000000000000000000000',
    treasury: '0x0000000000000000000000000000000000000000',
  },
} as const;

// CareCoin ERC-20 ABI (minimal for balance/transfer)
export const CARE_COIN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Reward Engine ABI (placeholder)
export const REWARD_ENGINE_ABI = [
  {
    name: 'submitAttestation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'eventHash', type: 'bytes32' },
      { name: 'eventType', type: 'uint8' },
      { name: 'providerWallet', type: 'address' },
      { name: 'patientWallet', type: 'address' },
      { name: 'orgWallet', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'getRewardHistory',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Registry ABI (placeholder)
export const REGISTRY_ABI = [
  {
    name: 'registerWallet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'entityType', type: 'uint8' },
      { name: 'entityIdHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getEntityByWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'entityType', type: 'uint8' },
      { name: 'entityIdHash', type: 'bytes32' },
      { name: 'isVerified', type: 'bool' },
    ],
  },
] as const;
