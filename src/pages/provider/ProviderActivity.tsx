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
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view your activity.</p>
        </div>
      </DashboardLayout>
    );
  }

  const displayActivities = activities || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-[hsl(var(--care-green))] text-primary-foreground gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 inline-block" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-[hsl(var(--care-warning))] text-[hsl(var(--care-warning))] gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--care-warning))] inline-block animate-pulse" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusAccent = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-l-2 border-l-[hsl(var(--care-green))]';
      case 'pending': return 'border-l-2 border-l-[hsl(var(--care-warning))]';
      case 'rejected': return 'border-l-2 border-l-destructive';
      default: return '';
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

  const truncateHash = (hash: string) => {
    if (!hash) return '—';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="page-header inline-block">Activity</h1>
            <p className="text-muted-foreground">View all your documentation events and rewards history</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>

        {/* Filters */}
        <Card variant="glass">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by event type or hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Documentation Events
              </CardTitle>
            </div>
            <CardDescription>{filteredActivities.length} events found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b">
                    <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-32" /></div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive"><p>Failed to load activity</p></div>
            ) : visibleActivities.length > 0 ? (
              <>
                <div className="divide-y divide-border/30 row-striped">
                  {visibleActivities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3 rounded-lg px-3 -mx-3 transition-all duration-200 hover:bg-muted/40 hover:shadow-sm ${getStatusAccent(activity.status)}`}
                      style={{ animation: `fade-in-up 0.3s ease-out ${Math.min(index, 10) * 40}ms both` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/60 ring-1 ring-border/30">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{activity.eventType}</span>
                            {getStatusBadge(activity.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                          </div>
                          {activity.eventHash && (
                            <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md border border-border/30 mt-2 inline-block">
                              {truncateHash(activity.eventHash)}
                            </code>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pl-11 sm:pl-0">
                        <p className="font-bold text-[hsl(var(--care-teal))]">
                          +{activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                      Load more ({filteredActivities.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground font-medium">No matching activity</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or date range</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
