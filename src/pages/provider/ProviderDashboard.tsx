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
import { Wallet, Coins, UserPlus, Users, Loader2, Banknote, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const { isConnected, isConnecting, address, entity, entityLoading, registerEntity, createOrganization, earnedBalance, totalBalance } = useWallet();
  const navigate = useNavigate();
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Connecting wallet…</span>
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
      toast({ title: 'Registered', description: 'You are now a provider.' });
    } else {
      toast({ title: 'Failed', description: 'Could not register. Try again.', variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  // Connect prompt
  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <Wallet className="h-10 w-10 text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">Connect Wallet</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your wallet to access the provider dashboard.
                </p>
              </div>
              <ConnectWalletButton />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Registration prompt
  if (!entityLoading && !entity) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="text-center">
                <Coins className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-semibold mt-3">Register as Provider</h2>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{address}</p>
              </div>

              {/* Organization selection */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Join organization
                  </label>
                  <Select value={selectedOrganization} onValueChange={(v) => { setSelectedOrganization(v); setNewOrganizationName(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={organizationsLoading ? 'Loading…' : 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.length === 0 ? (
                        <SelectItem value="none" disabled>None available</SelectItem>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>{org.display_name || 'Unnamed'}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    Create new
                  </label>
                  <Input
                    value={newOrganizationName}
                    onChange={(e) => { setNewOrganizationName(e.target.value); setSelectedOrganization(''); }}
                    placeholder="Organization name"
                  />
                </div>
              </div>

              <Button onClick={handleRegister} disabled={isRegistering || !canRegister} variant="gradient" className="w-full">
                {isRegistering ? 'Registering…' : 'Register'}
              </Button>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {entity?.display_name ? `Welcome, ${entity.display_name}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track rewards and CARE token earnings
            </p>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 shadow-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="text-lg font-bold text-primary">
                {totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-muted-foreground">CARE</span>
              </p>
            </div>
            <Button size="sm" variant="gradient" className="gap-1.5" onClick={() => navigate('/provider/offramp')}>
              <Banknote className="h-4 w-4" />
              Cash Out
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <WalletStatusCard />
          <EhrConnectCard />
          <div className="md:col-span-2 lg:col-span-1">
            <RewardsSummaryCard />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RewardsChart />
          <RecentActivityFeed />
        </div>
      </div>
    </DashboardLayout>
  );
}
