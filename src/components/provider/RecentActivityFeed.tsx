import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivityFeed() {
  const { data: activities, isLoading, error } = useRecentActivity(8);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-care-green text-white">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-care-warning text-care-warning">Pending</Badge>;
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
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
        ) : activities && activities.length > 0 ? (
          <div className="space-y-1">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{activity.eventType}</span>
                    {getStatusBadge(activity.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                    {activity.eventHash && (
                      <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
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
        ) : (
          <div className="py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Rewards will appear here when documentation events are processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
