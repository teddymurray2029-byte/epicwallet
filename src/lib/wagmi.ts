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
        name: 'CareWallet',
        description: 'Healthcare Rewards Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://carewallet.lovable.app',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [polygon.id]: http('https://polygon-bor-rpc.publicnode.com'),
    [polygonAmoy.id]: http('https://rpc.ankr.com/polygon_amoy'),
  },
  storage: createStorage({ storage: typeof window !== 'undefined' ? window.localStorage : undefined }),
  syncConnectedChain: true,
});

// Contract addresses (placeholders for deployment)
export const CONTRACT_ADDRESSES = {
  [polygon.id]: {
    careCoin: '0xac9f5c0ae3964bec937179a295bd45d977cf5655',
    rewardEngine: '0x0000000000000000000000000000000000000000',
    registry: '0x0000000000000000000000000000000000000000',
    treasury: '0x0000000000000000000000000000000000000000',
  },
  [polygonAmoy.id]: {
    careCoin: '0x0000000000000000000000000000000000000000',
    rewardEngine: '0x0000000000000000000000000000000000000000',
    registry: '0x0000000000000000000000000000000000000000',
    treasury: '0x0000000000000000000000000000000000000000',
  },
} as const;

// CareCoin ERC-20 ABI (includes burn from ERC20Burnable)
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
  {
    name: 'burn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
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
