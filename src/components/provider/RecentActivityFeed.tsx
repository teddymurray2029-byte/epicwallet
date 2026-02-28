import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentActivity } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivityFeed() {
  const { data: activities, isLoading, error } = useRecentActivity(8);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="status-success text-xs">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-care-warning text-care-warning text-xs">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive text-center text-sm">Failed to load activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-0">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{activity.eventType}</span>
                    {getStatusBadge(activity.status)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <span className="text-sm font-semibold text-care-teal">
                  +{activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
