import React from 'react';
import { TutorialTooltip, TutorialStep } from './TutorialTooltip';

const PROVIDER_SETUP_STEPS: TutorialStep[] = [
  {
    target: '[data-tutorial="connect-wallet"]',
    title: 'Connect Your Wallet',
    content: 'Start by connecting your MetaMask or WalletConnect wallet. This will be your identity in the CareWallet network.',
    position: 'bottom',
  },
  {
    target: '[data-tutorial="sidebar-nav"]',
    title: 'Navigate the Dashboard',
    content: 'Use the sidebar to access Rewards, Activity, Transactions, and Epic Connection pages.',
    position: 'right',
  },
  {
    target: '[data-tutorial="organization-link"]',
    title: 'Join or Create Organization',
    content: 'Go to Organization to create your healthcare organization or join an existing one with an invite link.',
    position: 'right',
  },
  {
    target: '[data-tutorial="epic-link"]',
    title: 'Connect Epic EHR',
    content: 'Link your Epic EHR system to automatically earn CareWallet rewards for documentation activities.',
    position: 'right',
  },
];

interface ProviderSetupTutorialProps {
  onComplete?: () => void;
}

export function ProviderSetupTutorial({ onComplete }: ProviderSetupTutorialProps) {
  return (
    <TutorialTooltip
      steps={PROVIDER_SETUP_STEPS}
      storageKey="provider_setup"
      onComplete={onComplete}
    />
  );
}
