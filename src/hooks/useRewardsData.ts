import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';

interface RewardSummary {
  totalEarned: number;
  thisMonth: number;
  thisWeek: number;
  pendingRewards: number;
  confirmedRewards: number;
}

interface RewardsByEventType {
  eventType: string;
  amount: number;
  count: number;
}

interface RecentActivity {
  id: string;
  eventType: string;
  amount: number;
  status: string;
  createdAt: string;
  eventHash: string;
}

interface TransactionHistory {
  id: string;
  amount: number;
  status: string;
  txHash: string | null;
  createdAt: string;
  confirmedAt: string | null;
  recipientType: string;
}

export function useRewardsSummary() {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['rewards-summary', entity?.id],
    queryFn: async (): Promise<RewardSummary> => {
      if (!entity?.id) {
        return {
          totalEarned: 0,
          thisMonth: 0,
          thisWeek: 0,
          pendingRewards: 0,
          confirmedRewards: 0,
        };
      }

      const { data: rewards, error } = await supabase
        .from('rewards_ledger')
        .select('amount, status, created_at')
        .eq('recipient_id', entity.id);

      if (error) throw error;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      let totalEarned = 0;
      let thisMonth = 0;
      let thisWeek = 0;
      let pendingRewards = 0;
      let confirmedRewards = 0;

      (rewards || []).forEach((r) => {
        const amount = Number(r.amount);
        const createdAt = new Date(r.created_at);

        if (r.status === 'confirmed') {
          confirmedRewards += amount;
          totalEarned += amount;

          if (createdAt >= startOfMonth) {
            thisMonth += amount;
          }
          if (createdAt >= startOfWeek) {
            thisWeek += amount;
          }
        } else if (r.status === 'pending') {
          pendingRewards += amount;
        }
      });

      return {
        totalEarned,
        thisMonth,
        thisWeek,
        pendingRewards,
        confirmedRewards,
      };
    },
    enabled: !!entity?.id,
  });
}

export function useRewardsByEventType() {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['rewards-by-event-type', entity?.id],
    queryFn: async (): Promise<RewardsByEventType[]> => {
      if (!entity?.id) return [];

      // Get rewards with attestation and event data
      const { data: rewards, error } = await supabase
        .from('rewards_ledger')
        .select(`
          amount,
          attestation:attestations (
            event:documentation_events (
              event_type
            )
          )
        `)
        .eq('recipient_id', entity.id)
        .eq('status', 'confirmed');

      if (error) throw error;

      // Aggregate by event type
      const byType: Record<string, { amount: number; count: number }> = {};

      (rewards || []).forEach((r) => {
        const eventType = (r.attestation as any)?.event?.event_type || 'unknown';
        if (!byType[eventType]) {
          byType[eventType] = { amount: 0, count: 0 };
        }
        byType[eventType].amount += Number(r.amount);
        byType[eventType].count += 1;
      });

      return Object.entries(byType).map(([eventType, data]) => ({
        eventType: eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        amount: data.amount,
        count: data.count,
      }));
    },
    enabled: !!entity?.id,
  });
}

export function useRecentActivity(limit = 10) {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['recent-activity', entity?.id, limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!entity?.id) return [];

      const { data, error } = await supabase
        .from('rewards_ledger')
        .select(`
          id,
          amount,
          status,
          created_at,
          attestation:attestations (
            event:documentation_events (
              event_type,
              event_hash
            )
          )
        `)
        .eq('recipient_id', entity.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((r) => ({
        id: r.id,
        eventType: ((r.attestation as any)?.event?.event_type || 'unknown')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        amount: Number(r.amount),
        status: r.status,
        createdAt: r.created_at,
        eventHash: (r.attestation as any)?.event?.event_hash || '',
      }));
    },
    enabled: !!entity?.id,
  });
}

export function useTransactionHistory() {
  const { entity } = useWallet();

  return useQuery({
    queryKey: ['transaction-history', entity?.id],
    queryFn: async (): Promise<TransactionHistory[]> => {
      if (!entity?.id) return [];

      const { data, error } = await supabase
        .from('rewards_ledger')
        .select('*')
        .eq('recipient_id', entity.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        txHash: r.tx_hash,
        createdAt: r.created_at,
        confirmedAt: r.confirmed_at,
        recipientType: r.recipient_type,
      }));
    },
    enabled: !!entity?.id,
  });
}

export function useRewardPolicies() {
  return useQuery({
    queryKey: ['reward-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reward_policies')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
  });
}
