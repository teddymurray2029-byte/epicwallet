import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { useRewardsSummary, useRewardsByEventType, useRewardPolicies } from '@/hooks/useRewardsData';
import { RewardsChart } from '@/components/provider/RewardsChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, TrendingUp, Calendar, Clock, Award, Percent } from 'lucide-react';

export default function ProviderRewards() {
  const { entity, isConnected, careBalance, balanceLoading } = useWallet();
  const { data: summary, isLoading: summaryLoading } = useRewardsSummary();
  const { data: byEventType, isLoading: byEventLoading } = useRewardsByEventType();
  const { data: policies, isLoading: policiesLoading } = useRewardPolicies();

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view your rewards.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      label: 'Total Earned',
      value: summary?.totalEarned ?? 0,
      icon: Coins,
      color: 'text-care-teal',
      bgColor: 'bg-care-teal/10',
    },
    {
      label: 'This Month',
      value: summary?.thisMonth ?? 0,
      icon: Calendar,
      color: 'text-care-green',
      bgColor: 'bg-care-green/10',
    },
    {
      label: 'This Week',
      value: summary?.thisWeek ?? 0,
      icon: TrendingUp,
      color: 'text-care-blue',
      bgColor: 'bg-care-blue/10',
    },
    {
      label: 'Pending',
      value: summary?.pendingRewards ?? 0,
      icon: Clock,
      color: 'text-care-warning',
      bgColor: 'bg-care-warning/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
          <p className="text-muted-foreground">
            Track your CareCoin earnings from healthcare documentation
          </p>
        </div>

        {/* Current Balance Hero */}
        <Card className="bg-gradient-to-r from-care-teal/10 to-care-green/10 border-care-teal/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                {balanceLoading ? (
                  <Skeleton className="h-10 w-40" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-care-teal">
                      {careBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xl text-muted-foreground">CARE</span>
                  </div>
                )}
              </div>
              <div className="h-16 w-16 rounded-full bg-care-teal/20 flex items-center justify-center">
                <Coins className="h-8 w-8 text-care-teal" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <p className={`text-xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RewardsChart />

          {/* Event Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Earnings by Event Type
              </CardTitle>
              <CardDescription>
                Breakdown of your rewards by documentation type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {byEventLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : byEventType && byEventType.length > 0 ? (
                <div className="space-y-3">
                  {byEventType.map((item) => (
                    <div
                      key={item.eventType}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.eventType}</p>
                        <p className="text-xs text-muted-foreground">{item.count} events</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-care-teal">
                          {item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No rewards earned yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Reward Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Active Reward Policies
            </CardTitle>
            <CardDescription>
              Current reward rates for documentation events (10% network fee applied)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {policiesLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : policies && policies.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {policy.event_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-care-teal">
                      {policy.base_reward} CARE
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Provider: {policy.provider_split}% • Org: {policy.organization_split}% • Patient: {policy.patient_split}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Percent className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No active policies</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}