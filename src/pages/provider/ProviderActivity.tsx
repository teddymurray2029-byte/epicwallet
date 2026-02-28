import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWallet } from '@/contexts/WalletContext';
import { useRecentActivity } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Search, Filter, FileText, CalendarDays } from 'lucide-react';
import { formatDistanceToNow, format, subDays, subWeeks, subMonths, isAfter } from 'date-fns';

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

const PAGE_SIZE = 15;

export default function ProviderActivity() {
  const { entity, isConnected } = useWallet();
  const { data: activities, isLoading, error, refetch } = useRecentActivity(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Connect your wallet to view activity.</p>
        </div>
      </DashboardLayout>
    );
  }

  const displayActivities = activities || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="status-success text-xs">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-care-warning text-care-warning text-xs">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="text-xs">Expired</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const getDateCutoff = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today': return subDays(now, 1);
      case 'week': return subWeeks(now, 1);
      case 'month': return subMonths(now, 1);
      default: return null;
    }
  };

  const dateCutoff = getDateCutoff();
  const filteredActivities = displayActivities.filter((activity) => {
    const matchesSearch = activity.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.eventHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesDate = !dateCutoff || isAfter(new Date(activity.createdAt), dateCutoff);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const visibleActivities = filteredActivities.slice(0, visibleCount);
  const hasMore = visibleCount < filteredActivities.length;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">Documentation events and rewards history</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by event type or hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Events
            </CardTitle>
            <CardDescription>{filteredActivities.length} found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="space-y-1.5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-28" /></div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-center py-8 text-sm text-destructive">Failed to load activity</p>
            ) : visibleActivities.length > 0 ? (
              <>
                <div className="divide-y">
                  {visibleActivities.map((activity) => (
                    <div key={activity.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2">
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{activity.eventType}</span>
                            {getStatusBadge(activity.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                          </div>
                          {activity.eventHash && (
                            <code className="text-xs font-mono text-muted-foreground mt-1 inline-block">
                              {activity.eventHash.slice(0, 10)}...{activity.eventHash.slice(-8)}
                            </code>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-care-teal pl-7 sm:pl-0">
                        +{activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                      </span>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                      Load more ({filteredActivities.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No matching activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
