import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRewardsSummary } from '@/hooks/useRewardsData';
import { TrendingUp, Calendar, Clock, Coins } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function RewardsSummaryCard() {
  const { data, isLoading, error } = useRewardsSummary();

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive text-center text-sm">Failed to load rewards summary</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Total Earned', value: data?.totalEarned ?? 0, icon: Coins, color: 'text-care-teal' },
    { label: 'This Month', value: data?.thisMonth ?? 0, icon: Calendar, color: 'text-care-green' },
    { label: 'This Week', value: data?.thisWeek ?? 0, icon: TrendingUp, color: 'text-care-blue' },
    { label: 'Pending', value: data?.pendingRewards ?? 0, icon: Clock, color: 'text-care-warning' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground font-normal ml-1">CARE</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
