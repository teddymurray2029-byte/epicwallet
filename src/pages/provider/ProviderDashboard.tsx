import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WalletStatusCard } from '@/components/provider/WalletStatusCard';
import { RewardsSummaryCard } from '@/components/provider/RewardsSummaryCard';
import { RecentActivityFeed } from '@/components/provider/RecentActivityFeed';
import { RewardsChart } from '@/components/provider/RewardsChart';
import { EhrConnectCard } from '@/components/provider/EhrConnectCard';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, Coins, UserPlus, TrendingUp, Activity, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderSetupTutorial } from '@/components/tutorial/ProviderSetupTutorial';

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

  if (isConnecting) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="loading-card max-w-xs w-full animate-scale-pop">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--care-teal))] via-[hsl(var(--care-blue))] to-[hsl(var(--care-green))] text-white shadow-[var(--shadow-glow-teal)]">
              <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7">
                <text x="3" y="23" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="white">CC</text>
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Connecting wallet...</span>
            </div>
          </div>
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
      toast({ title: 'Registration Successful', description: 'You are now registered as a provider.' });
    } else {
      toast({ title: 'Registration Failed', description: 'Could not register your wallet. Please try again.', variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Show connect prompt if not connected
  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 bg-mesh-animated rounded-2xl">
          <Card className="max-w-md w-full shimmer-border bg-gradient-to-br from-background via-background to-primary/10 shadow-[var(--shadow-elevated)]">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 ring-1 ring-primary/30 shadow-[var(--shadow-glow-teal)] flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gradient-hero">Connect Your Wallet</h2>
                <p className="text-muted-foreground">
                  Connect your wallet to access the CareCoin Provider Dashboard and view your healthcare documentation rewards.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <ConnectWalletButton />
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                  <Shield className="h-3 w-3 text-primary" />
                  <span>Your wallet is your identity. No email or password needed.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-md w-full">
            {[
              { icon: Coins, label: 'Earn Rewards', desc: 'CARE tokens for documentation' },
              { icon: Activity, label: 'Track Activity', desc: 'Real-time event monitoring' },
              { icon: TrendingUp, label: 'On-Chain Tokens', desc: 'Transparent blockchain rewards' },
            ].map((feat, i) => (
              <div
                key={feat.label}
                className="flex flex-col items-center text-center p-4 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm card-hover-lift"
                style={{ animation: `fade-in-up 0.4s ease-out ${(i + 1) * 100}ms both` }}
              >
                <feat.icon className="h-6 w-6 text-primary mb-2" />
                <p className="text-xs font-medium">{feat.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show registration prompt if connected but not registered
  if (!entityLoading && !entity) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6">
          <Card className="max-w-md w-full shimmer-border bg-gradient-to-br from-background via-background to-[hsl(var(--care-warning)/0.1)] shadow-[var(--shadow-elevated)]">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--care-warning)/0.1)] ring-1 ring-[hsl(var(--care-warning)/0.3)] shadow-[0_0_18px_hsl(var(--care-warning)/0.25)] flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <Coins className="h-8 w-8 text-[hsl(var(--care-warning))]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gradient">Wallet Not Registered</h2>
                <p className="text-muted-foreground">
                  Your wallet is connected but not yet registered in the CareCoin network.
                </p>
              </div>
              <div className="p-4 glass-card rounded-lg">
                <p className="text-xs text-muted-foreground font-mono break-all">{address}</p>
              </div>

              {/* Organization selection with visual separation */}
              <div className="space-y-4 text-left">
                <div className="space-y-2 p-4 rounded-lg border border-border/40 bg-muted/20">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Join existing organization
                  </p>
                  <Select value={selectedOrganization} onValueChange={(value) => { setSelectedOrganization(value); setNewOrganizationName(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={organizationsLoading ? 'Loading organizations...' : 'Select organization'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.length === 0 ? (
                        <SelectItem value="none" disabled>No organizations available</SelectItem>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>{org.display_name || 'Unnamed organization'}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">or</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>

                <div className="space-y-2 p-4 rounded-lg border border-border/40 bg-muted/20">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    Create a new organization
                  </p>
                  <Input
                    value={newOrganizationName}
                    onChange={(event) => { setNewOrganizationName(event.target.value); setSelectedOrganization(''); }}
                    placeholder="Organization name"
                  />
                  <p className="text-xs text-muted-foreground">Creating a new organization assigns you as the owner.</p>
                </div>
              </div>

              <Button
                onClick={handleRegister}
                disabled={isRegistering || !canRegister}
                variant="gradient"
                className="w-full"
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
      <ProviderSetupTutorial />
      <div className="space-y-6">
        {/* Welcome banner */}
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block text-3xl sm:text-4xl tracking-tighter">
            {entity?.display_name ? `Welcome back, ${entity.display_name}` : 'Provider Dashboard'}
          </h1>
          <div className="mt-1.5 h-1 w-16 rounded-full bg-gradient-to-r from-[hsl(var(--care-teal))] to-[hsl(var(--care-green))] opacity-60" />
          <p className="text-muted-foreground mt-2">
            Track your healthcare documentation rewards and CARE token earnings
          </p>
        </div>

        {/* Dashboard grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="animate-fade-in-up animate-stagger-1">
            <WalletStatusCard />
          </div>
          <div className="animate-fade-in-up animate-stagger-2">
            <EhrConnectCard />
          </div>
          <div className="md:col-span-2 lg:col-span-1 animate-fade-in-up animate-stagger-3">
            <RewardsSummaryCard />
          </div>
        </div>

        {/* Charts and Activity row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="animate-fade-in-up animate-stagger-4">
            <RewardsChart />
          </div>
          <div className="animate-fade-in-up animate-stagger-5">
            <RecentActivityFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
