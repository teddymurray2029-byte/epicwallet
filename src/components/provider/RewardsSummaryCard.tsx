import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useRewardsSummary } from '@/hooks/useRewardsData';
import { TrendingUp, Calendar, Clock, Coins } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
export function RewardsSummaryCard() {
  const { data, isLoading, error } = useRewardsSummary();

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive text-center">Failed to load rewards summary</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Total Earned', value: data?.totalEarned ?? 0, icon: Coins, color: 'text-care-teal', bgColor: 'bg-care-teal/10', ringColor: 'ring-care-teal/20' },
    { label: 'This Month', value: data?.thisMonth ?? 0, icon: Calendar, color: 'text-care-green', bgColor: 'bg-care-green/10', ringColor: 'ring-care-green/20' },
    { label: 'This Week', value: data?.thisWeek ?? 0, icon: TrendingUp, color: 'text-care-blue', bgColor: 'bg-care-blue/10', ringColor: 'ring-care-blue/20' },
    { label: 'Pending', value: data?.pendingRewards ?? 0, icon: Clock, color: 'text-care-warning', bgColor: 'bg-care-warning/10', ringColor: 'ring-care-warning/20' },
  ];

  return (
    <Card className={`card-glow-green border-border/40 bg-gradient-to-br from-card via-card to-accent/5 transition-all duration-300 hover:card-shadow-hover`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Rewards Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border border-border/30 p-4 ${stat.bgColor} shadow-[var(--shadow-card)] transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bgColor} ring-1 ${stat.ringColor}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground">CARE</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
