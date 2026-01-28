import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WalletStatusCard } from '@/components/provider/WalletStatusCard';
import { RewardsSummaryCard } from '@/components/provider/RewardsSummaryCard';
import { RecentActivityFeed } from '@/components/provider/RecentActivityFeed';
import { RewardsChart } from '@/components/provider/RewardsChart';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Shield, Coins } from 'lucide-react';

export default function ProviderDashboard() {
  const { isConnected, entity, entityLoading } = useWallet();

  // Show connect prompt if not connected
  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
                <p className="text-muted-foreground">
                  Connect your wallet to access the CareCoin Provider Dashboard and view your healthcare documentation rewards.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <ConnectWalletButton />
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Shield className="h-3 w-3" />
                  <span>Your wallet is your identity. No email or password needed.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show registration prompt if connected but not registered
  if (!entityLoading && !entity) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-care-warning/10 flex items-center justify-center">
                <Coins className="h-8 w-8 text-care-warning" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Wallet Not Registered</h2>
                <p className="text-muted-foreground">
                  Your wallet is connected but not yet registered in the CareCoin network.
                  Contact your healthcare organization administrator to register your wallet as a provider.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {/* Show truncated address */}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Track your healthcare documentation rewards and CARE token earnings
          </p>
        </div>

        {/* Dashboard grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Wallet Status - spans 1 column */}
          <WalletStatusCard />

          {/* Rewards Summary - spans 2 columns */}
          <div className="md:col-span-1 lg:col-span-2">
            <RewardsSummaryCard />
          </div>
        </div>

        {/* Charts and Activity row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RewardsChart />
          <RecentActivityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}
