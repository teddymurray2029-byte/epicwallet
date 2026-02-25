import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useRewardsSummary, useRewardsByEventType } from '@/hooks/useRewardsData';
import { Coins, Calendar, TrendingUp, Clock, Award, FileText } from 'lucide-react';

export default function PatientRewards() {
  const { isConnected, entity, earnedBalance, earnedBalanceLoading } = useWallet();
  const { data: summary, isLoading: summaryLoading } = useRewardsSummary();
  const { data: byEventType, isLoading: byEventLoading } = useRewardsByEventType();

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view rewards.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    { label: 'Total Earned', value: summary?.totalEarned ?? 0, icon: Coins, color: 'text-[hsl(var(--care-teal))]', bgColor: 'bg-[hsl(var(--care-teal)/0.1)]', borderColor: 'border-t-[hsl(var(--care-teal))]' },
    { label: 'This Month', value: summary?.thisMonth ?? 0, icon: Calendar, color: 'text-[hsl(var(--care-green))]', bgColor: 'bg-[hsl(var(--care-green)/0.1)]', borderColor: 'border-t-[hsl(var(--care-green))]' },
    { label: 'This Week', value: summary?.thisWeek ?? 0, icon: TrendingUp, color: 'text-[hsl(var(--care-blue))]', bgColor: 'bg-[hsl(var(--care-blue)/0.1)]', borderColor: 'border-t-[hsl(var(--care-blue))]' },
    { label: 'Pending', value: summary?.pendingRewards ?? 0, icon: Clock, color: 'text-[hsl(var(--care-warning))]', bgColor: 'bg-[hsl(var(--care-warning)/0.1)]', borderColor: 'border-t-[hsl(var(--care-warning))]' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">My Rewards</h1>
          <p className="text-muted-foreground">Track your CARE token earnings from healthcare participation</p>
        </div>

        {/* Balance */}
        <Card className="shimmer-border bg-hero-gradient border-[hsl(var(--care-teal)/0.2)] overflow-hidden relative">
          <div className="absolute inset-0 bg-card-mesh pointer-events-none" />
          <CardContent className="pt-6 relative flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total CARE Balance</p>
              {earnedBalanceLoading ? <Skeleton className="h-10 w-40" /> : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gradient inline-block">{earnedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="text-xl text-muted-foreground">CARE</span>
                </div>
              )}
            </div>
            <div className="h-14 w-14 rounded-full bg-[hsl(var(--care-teal)/0.2)] flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <Coins className="h-7 w-7 text-[hsl(var(--care-teal))]" />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className={`border-t-2 ${stat.borderColor} card-interactive`} style={{ animation: `fade-in-up 0.4s ease-out ${index * 80}ms both` }}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {summaryLoading ? <Skeleton className="h-6 w-20 mt-1" /> : (
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By event type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5" /> Rewards by Event Type</CardTitle>
            <CardDescription>How your rewards break down by documentation type</CardDescription>
          </CardHeader>
          <CardContent>
            {byEventLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : byEventType && byEventType.length > 0 ? (
              <div className="space-y-3">
                {byEventType.map((item, index) => (
                  <div key={item.eventType} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/20 hover:bg-muted/60 transition-all" style={{ animation: `fade-in-up 0.3s ease-out ${index * 50}ms both` }}>
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-[hsl(var(--care-teal)/0.1)]"><FileText className="h-4 w-4 text-[hsl(var(--care-teal))]" /></div>
                      <div>
                        <p className="font-medium text-sm">{item.eventType}</p>
                        <p className="text-xs text-muted-foreground">{item.count} events</p>
                      </div>
                    </div>
                    <p className="font-bold text-[hsl(var(--care-teal))]">{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No rewards data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
