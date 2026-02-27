import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  totalEarned: number;
  eventCount: number;
  entityId: string;
}

function useLeaderboard() {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['leaderboard', entity?.organization_id],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Fetch all confirmed rewards with recipient info
      let query = supabase
        .from('rewards_ledger')
        .select(`
          amount,
          recipient_id,
          recipient:entities!rewards_ledger_recipient_id_fkey (
            id,
            display_name,
            entity_type,
            organization_id
          )
        `)
        .eq('status', 'confirmed')
        .eq('recipient_type', 'provider');

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by provider
      const byProvider: Record<string, { displayName: string; total: number; count: number; entityId: string }> = {};

      (data || []).forEach((r) => {
        const recipient = r.recipient as any;
        if (!recipient || recipient.entity_type !== 'provider') return;

        // Org-scope: only show providers in same org if user belongs to one
        if (entity?.organization_id && recipient.organization_id !== entity.organization_id) return;

        const id = recipient.id;
        if (!byProvider[id]) {
          byProvider[id] = {
            displayName: recipient.display_name || `Provider ${id.slice(0, 6)}`,
            total: 0,
            count: 0,
            entityId: id,
          };
        }
        byProvider[id].total += Number(r.amount);
        byProvider[id].count += 1;
      });

      return Object.values(byProvider)
        .sort((a, b) => b.total - a.total)
        .slice(0, 25)
        .map((entry, i) => ({
          rank: i + 1,
          displayName: entry.displayName,
          totalEarned: entry.total,
          eventCount: entry.count,
          entityId: entry.entityId,
        }));
    },
  });
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function RewardsLeaderboard() {
  const { entity } = useWallet();
  const { data: leaderboard, isLoading, error } = useLeaderboard();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Rewards Leaderboard</h1>
          <p className="text-muted-foreground">
            {entity?.organization_id
              ? 'Top-earning providers in your organization'
              : 'Top-earning providers across the network'}
          </p>
        </div>

        {/* Top 3 Podium */}
        {!isLoading && leaderboard && leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            {[1, 0, 2].map((idx) => {
              const entry = leaderboard[idx];
              if (!entry) return null;
              const isFirst = idx === 0;
              return (
                <Card
                  key={entry.entityId}
                  variant={isFirst ? 'glow' : 'glass'}
                  className={`text-center ${isFirst ? 'row-span-2 border-[hsl(var(--care-teal)/0.3)]' : ''}`}
                >
                  <CardContent className="pt-6 space-y-2">
                    <RankIcon rank={entry.rank} />
                    <p className="font-semibold text-sm truncate">{entry.displayName}</p>
                    <p className={`text-lg font-bold ${isFirst ? 'text-[hsl(var(--care-teal))]' : 'text-foreground'}`}>
                      {entry.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">CARE earned</p>
                    <Badge variant="secondary" className="text-xs">{entry.eventCount} events</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Rankings
            </CardTitle>
            <CardDescription>Top 25 providers by confirmed CARE rewards</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">Failed to load leaderboard.</p>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Users className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No rewards data yet. Leaderboard populates as providers earn CARE.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => {
                  const isCurrentUser = entry.entityId === entity?.id;
                  return (
                    <div
                      key={entry.entityId}
                      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                        isCurrentUser
                          ? 'bg-[hsl(var(--care-teal)/0.1)] ring-1 ring-[hsl(var(--care-teal)/0.2)]'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <RankIcon rank={entry.rank} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {entry.displayName}
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.eventCount} events documented</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{entry.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-muted-foreground">CARE</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
