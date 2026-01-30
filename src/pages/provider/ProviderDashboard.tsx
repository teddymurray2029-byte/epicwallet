import React, { useEffect, useMemo, useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrganizationOption {
  id: string;
  display_name: string | null;
}

export default function ProviderDashboard() {
  const { isConnected, isConnecting, address, entity, entityLoading, registerEntity, createOrganization } = useWallet();
  const [isRegistering, setIsRegistering] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [newOrganizationName, setNewOrganizationName] = useState('');

  const canRegister = useMemo(() => {
    return Boolean(selectedOrganization || newOrganizationName.trim());
  }, [newOrganizationName, selectedOrganization]);

  useEffect(() => {
    const loadOrganizations = async () => {
      setOrganizationsLoading(true);
      const { data, error } = await supabase
        .from('entities')
        .select('id, display_name')
        .eq('entity_type', 'organization')
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error loading organizations:', error);
      } else {
        setOrganizations(data || []);
      }
      setOrganizationsLoading(false);
    };

    if (isConnected && !entity) {
      loadOrganizations();
    }
  }, [isConnected, entity]);

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
    let organizationId = selectedOrganization || null;

    if (!organizationId && newOrganizationName.trim()) {
      organizationId = await createOrganization(newOrganizationName.trim());
    }

    const success = await registerEntity('provider', undefined, organizationId);
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
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {address}
                </p>
              </div>
              <div className="space-y-3 text-left">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Choose your organization</p>
                  <Select
                    value={selectedOrganization}
                    onValueChange={(value) => setSelectedOrganization(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={organizationsLoading ? 'Loading organizations...' : 'Select organization'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No organizations available
                        </SelectItem>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.display_name || 'Unnamed organization'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Or create a new organization</p>
                  <Input
                    value={newOrganizationName}
                    onChange={(event) => setNewOrganizationName(event.target.value)}
                    placeholder="Organization name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Creating a new organization assigns you as the owner.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRegister}
                disabled={isRegistering || !canRegister}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isRegistering ? 'Registering...' : 'Register as Provider'}
              </Button>
              {!canRegister && (
                <p className="text-xs text-care-warning">
                  Select an organization or create a new one to continue.
                </p>
              )}
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
