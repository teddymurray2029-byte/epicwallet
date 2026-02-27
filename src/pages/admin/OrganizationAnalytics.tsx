import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, Coins, Activity, TrendingUp, CheckCircle } from 'lucide-react';

const CHART_COLORS = [
  'hsl(var(--care-teal))',
  'hsl(var(--care-blue))',
  'hsl(var(--care-green))',
  'hsl(180, 30%, 50%)',
  'hsl(200, 40%, 55%)',
  'hsl(160, 35%, 45%)',
  'hsl(220, 30%, 50%)',
  'hsl(140, 25%, 50%)',
];

interface OrgAnalytics {
  totalProviders: number;
  totalRewardsEarned: number;
  totalEvents: number;
  confirmedRate: number;
  eventsByType: { name: string; count: number; amount: number }[];
  rewardsByMonth: { month: string; amount: number }[];
  topProviders: { name: string; amount: number }[];
}

function useOrgAnalytics() {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['org-analytics', entity?.id, entity?.organization_id],
    queryFn: async (): Promise<OrgAnalytics> => {
      const orgId = entity?.entity_type === 'organization' ? entity.id : entity?.organization_id;
      if (!orgId) throw new Error('No organization');

      // Get providers in org
      const { data: providers } = await supabase
        .from('entities')
        .select('id, display_name')
        .eq('organization_id', orgId)
        .eq('entity_type', 'provider');

      const providerIds = (providers || []).map((p) => p.id);

      // Get rewards for these providers
      const { data: rewards } = await supabase
        .from('rewards_ledger')
        .select(`
          amount,
          status,
          created_at,
          recipient_id,
          attestation:attestations (
            event:documentation_events (
              event_type
            )
          )
        `)
        .in('recipient_id', providerIds.length ? providerIds : ['none']);

      const allRewards = rewards || [];

      const totalRewardsEarned = allRewards
        .filter((r) => r.status === 'confirmed')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const confirmedCount = allRewards.filter((r) => r.status === 'confirmed').length;
      const confirmedRate = allRewards.length > 0 ? (confirmedCount / allRewards.length) * 100 : 0;

      // Events by type
      const eventTypeCounts: Record<string, { count: number; amount: number }> = {};
      allRewards.forEach((r) => {
        const eventType = (r.attestation as any)?.event?.event_type || 'unknown';
        const label = eventType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        if (!eventTypeCounts[label]) eventTypeCounts[label] = { count: 0, amount: 0 };
        eventTypeCounts[label].count += 1;
        if (r.status === 'confirmed') eventTypeCounts[label].amount += Number(r.amount);
      });

      // Rewards by month (last 6 months)
      const monthMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthMap[key] = 0;
      }
      allRewards
        .filter((r) => r.status === 'confirmed')
        .forEach((r) => {
          const d = new Date(r.created_at);
          const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          if (key in monthMap) monthMap[key] += Number(r.amount);
        });

      // Top providers
      const providerTotals: Record<string, number> = {};
      allRewards
        .filter((r) => r.status === 'confirmed')
        .forEach((r) => {
          const prov = providers?.find((p) => p.id === r.recipient_id);
          const name = prov?.display_name || `Provider ${r.recipient_id.slice(0, 6)}`;
          providerTotals[name] = (providerTotals[name] || 0) + Number(r.amount);
        });

      return {
        totalProviders: providerIds.length,
        totalRewardsEarned,
        totalEvents: allRewards.length,
        confirmedRate,
        eventsByType: Object.entries(eventTypeCounts)
          .map(([name, d]) => ({ name, ...d }))
          .sort((a, b) => b.count - a.count),
        rewardsByMonth: Object.entries(monthMap).map(([month, amount]) => ({ month, amount })),
        topProviders: Object.entries(providerTotals)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5),
      };
    },
    enabled: !!entity && (entity.entity_type === 'organization' || !!entity.organization_id),
  });
}

export default function OrganizationAnalytics() {
  const { entity, isOrganization } = useWallet();
  const { data: analytics, isLoading } = useOrgAnalytics();

  if (!entity || (!isOrganization && !entity.organization_id)) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 space-y-4">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Organization Analytics</h2>
          <p className="text-muted-foreground">You must be part of an organization to view analytics.</p>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { icon: Users, label: 'Providers', value: analytics?.totalProviders ?? 0, color: 'care-blue' },
    { icon: Coins, label: 'Total CARE Earned', value: analytics?.totalRewardsEarned ?? 0, color: 'care-teal' },
    { icon: Activity, label: 'Total Events', value: analytics?.totalEvents ?? 0, color: 'care-green' },
    { icon: CheckCircle, label: 'Confirmation Rate', value: `${(analytics?.confirmedRate ?? 0).toFixed(1)}%`, color: 'care-teal' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Organization Analytics</h1>
          <p className="text-muted-foreground">Aggregate performance across your organization's providers</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card key={stat.label} className="card-interactive" style={{ animation: `fade-in-up 0.4s ease-out ${i * 60}ms both` }}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-[hsl(var(--${stat.color})/0.1)] ring-1 ring-[hsl(var(--${stat.color})/0.15)]`}>
                    <stat.icon className={`h-5 w-5 text-[hsl(var(--${stat.color}))]`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-6 w-16 mt-1" />
                    ) : (
                      <p className="text-xl font-bold">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : stat.value}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rewards by Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Rewards Over Time</CardTitle>
              <CardDescription>Monthly confirmed CARE rewards (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics?.rewardsByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--care-teal))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Events by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Events by Type</CardTitle>
              <CardDescription>Distribution of documentation events</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : analytics?.eventsByType && analytics.eventsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analytics.eventsByType}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {analytics.eventsByType.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No event data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Providers</CardTitle>
            <CardDescription>Highest-earning providers in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !analytics?.topProviders?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No provider data yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.topProviders.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold p-0">
                      {i + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                    </div>
                    <p className="font-bold text-sm">{p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-muted-foreground font-normal">CARE</span></p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
