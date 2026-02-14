import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MOCK_RECENT_ACTIVITY } from '@/lib/mockData';

export function RecentActivityFeed() {
  const { data: activities, isLoading, error } = useRecentActivity(8);

  const isMock = !isLoading && (!activities || activities.length === 0) && !error;
  const displayData = isMock ? MOCK_RECENT_ACTIVITY : activities;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-care-green text-primary-foreground gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 inline-block" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-care-warning text-care-warning gap-1"><span className="h-1.5 w-1.5 rounded-full bg-care-warning inline-block animate-pulse" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const truncateHash = (hash: string) => {
    if (!hash) return '—';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive text-center">Failed to load activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`card-shadow border-border/40 bg-gradient-to-br from-card via-card to-muted/30 transition-all duration-300 hover:card-shadow-hover ${isMock ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          {isMock && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Sample Data</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : displayData && displayData.length > 0 ? (
          <div className="space-y-1">
            {displayData.map((activity, index) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between py-3 border-b border-border/30 last:border-0 hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-all duration-200 ${
                  index % 2 === 0 ? 'bg-muted/10' : ''
                }`}
                style={{ animation: `fade-in-up 0.4s ease-out ${index * 60}ms both` }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{activity.eventType}</span>
                    {getStatusBadge(activity.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                    {activity.eventHash && (
                      <code className="font-mono bg-muted/60 px-1.5 py-0.5 rounded-md border border-border/30">
                        {truncateHash(activity.eventHash)}
                      </code>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-care-teal">
                    +{activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">CARE</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
