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
import { Activity, Search, Filter, ExternalLink, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function ProviderActivity() {
  const { entity, isConnected } = useWallet();
  const { data: activities, isLoading, error, refetch } = useRecentActivity(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-care-green text-primary-foreground gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 inline-block" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-care-warning text-care-warning gap-1"><span className="h-1.5 w-1.5 rounded-full bg-care-warning inline-block animate-pulse" />Pending</Badge>;
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

  const filteredActivities = (activities || []).filter((activity) => {
    const matchesSearch = activity.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.eventHash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const truncateHash = (hash: string) => {
    if (!hash) return '—';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gradient-hero inline-block">Activity</h1>
            <p className="text-muted-foreground">
              View all your documentation events and rewards history
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by event type or hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Documentation Events
            </CardTitle>
            <CardDescription>
              {filteredActivities.length} events found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Failed to load activity</p>
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="divide-y divide-border/30">
                {filteredActivities.map((activity, index) => (
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
                      <div className="text-right">
                        <p className="font-bold text-care-teal">
                          +{activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground">No activity found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Documentation events will appear here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
