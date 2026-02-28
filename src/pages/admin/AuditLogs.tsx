import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield, Search, Filter, CalendarDays, RefreshCw,
  User, Globe, Clock, ChevronDown, FileText,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, subWeeks, subMonths } from 'date-fns';

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_wallet: string | null;
  actor_entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];

const PAGE_SIZE = 25;

export default function AuditLogs() {
  const { isConnected, entity, isAdmin } = useWallet();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (dateFilter !== 'all') {
        const now = new Date();
        let cutoff: Date;
        switch (dateFilter) {
          case 'today': cutoff = subDays(now, 1); break;
          case 'week': cutoff = subWeeks(now, 1); break;
          case 'month': cutoff = subMonths(now, 1); break;
          default: cutoff = new Date(0);
        }
        query = query.gte('created_at', cutoff.toISOString());
      }

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditLogEntry[]) || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, resourceFilter]);

  useEffect(() => {
    if (isConnected && entity) fetchLogs();
  }, [isConnected, entity, fetchLogs]);

  const resourceTypes = [...new Set(logs.map((l) => l.resource_type))].sort();

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.resource_type.toLowerCase().includes(q) ||
      (log.actor_wallet?.toLowerCase().includes(q)) ||
      (log.resource_id?.toLowerCase().includes(q))
    );
  });

  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLogs.length;

  const truncateWallet = (addr: string | null) => {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('register')) return 'bg-[hsl(var(--care-green)/0.1)] text-[hsl(var(--care-green))]';
    if (action.includes('delete') || action.includes('revoke')) return 'bg-destructive/10 text-destructive';
    if (action.includes('update') || action.includes('save')) return 'bg-[hsl(var(--care-blue)/0.1)] text-[hsl(var(--care-blue))]';
    return 'bg-muted text-muted-foreground';
  };

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view audit logs.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="page-header inline-block">Audit Logs</h1>
            <p className="text-muted-foreground">Review all system actions and security events</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search actions, wallets, resources..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Resource type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {resourceTypes.map((rt) => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> System Events
            </CardTitle>
            <CardDescription>{filteredLogs.length} entries found</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b">
                    <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : visibleLogs.length > 0 ? (
              <>
                <div className="divide-y divide-border/30 row-striped">
                  {visibleLogs.map((log, index) => (
                    <div
                      key={log.id}
                      className="py-4 rounded-lg px-3 -mx-3 transition-all duration-200 hover:bg-muted/40"
                      style={{ animation: `fade-in-up 0.3s ease-out ${Math.min(index, 10) * 30}ms both` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted/60 ring-1 ring-border/30">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getActionColor(log.action)} variant="secondary">
                                {log.action}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {log.resource_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                              </span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                              {log.actor_wallet && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <code className="font-mono">{truncateWallet(log.actor_wallet)}</code>
                                  </span>
                                </>
                              )}
                              {log.ip_address && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {log.ip_address}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          >
                            Details <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                          </Button>
                        )}
                      </div>
                      {expandedId === log.id && log.details && (
                        <pre className="mt-3 ml-11 p-3 rounded-lg bg-muted/60 border border-border/30 text-xs font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                      Load more ({filteredLogs.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground font-medium">No matching audit logs</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
