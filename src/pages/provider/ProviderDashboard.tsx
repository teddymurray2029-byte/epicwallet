import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WalletStatusCard } from '@/components/provider/WalletStatusCard';
import { RewardsSummaryCard } from '@/components/provider/RewardsSummaryCard';
import { RecentActivityFeed } from '@/components/provider/RecentActivityFeed';
import { RewardsChart } from '@/components/provider/RewardsChart';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, Coins, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ProviderDashboard() {
  const { isConnected, isConnecting, address, entity, entityLoading, registerEntity } = useWallet();
  const [isRegistering, setIsRegistering] = useState(false);

  // Wait for wallet reconnection before showing connect prompt
  if (isConnecting) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Connecting wallet...</div>
        </div>
      </DashboardLayout>
    );
  }

  const handleRegister = async () => {
    setIsRegistering(true);
    const success = await registerEntity('provider');
    if (success) {
      toast({
        title: 'Registration Successful',
        description: 'You are now registered as a provider.',
      });
    } else {
      toast({
        title: 'Registration Failed',
        description: 'Could not register your wallet. Please try again.',
        variant: 'destructive',
      });
    }
    setIsRegistering(false);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Show connect prompt if not connected
  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6">
          <Card className="max-w-md w-full border border-primary/20 bg-gradient-to-br from-background via-background to-primary/10 shadow-[0_0_35px_rgba(56,189,248,0.18)]">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/30 shadow-[0_0_18px_rgba(56,189,248,0.25)] flex items-center justify-center">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-care-teal">
                  Connect Your Wallet
                </h2>
                <p className="text-muted-foreground">
                  Connect your wallet to access the CareCoin Provider Dashboard and view your healthcare documentation rewards.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <ConnectWalletButton />
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Shield className="h-3 w-3 text-care-teal" />
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6">
          <Card className="max-w-md w-full border border-care-warning/20 bg-gradient-to-br from-background via-background to-care-warning/10 shadow-[0_0_35px_rgba(251,191,36,0.16)]">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-care-warning/10 ring-1 ring-care-warning/30 shadow-[0_0_18px_rgba(251,191,36,0.25)] flex items-center justify-center">
                <Coins className="h-8 w-8 text-care-warning" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-care-warning to-care-teal">
                  Wallet Not Registered
                </h2>
                <p className="text-muted-foreground">
                  Your wallet is connected but not yet registered in the CareCoin network.
                </p>
              </div>
              <div className="p-4 bg-muted/70 border border-border/60 rounded-lg">
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {address}
                </p>
              </div>
              <Button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full bg-gradient-to-r from-care-warning to-care-teal text-white shadow-[0_0_18px_rgba(251,191,36,0.25)] hover:from-care-warning/90 hover:to-care-teal/90"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isRegistering ? 'Registering...' : 'Register as Provider'}
              </Button>
              <p className="text-xs text-muted-foreground">
                This registers your wallet for testing. Production registration requires admin approval.
              </p>
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
