import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowDownLeft, Receipt } from 'lucide-react';

interface CardTransaction {
  id: string;
  care_amount: number;
  usd_amount: number;
  fee_amount: number;
  status: string;
  created_at: string;
}

interface CardActivityTableProps {
  entityId: string;
}

export function CardActivityTable({ entityId }: CardActivityTableProps) {
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('virtual-card', {
          body: { action: 'history', entity_id: entityId },
        });
        setTransactions(data?.transactions || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entityId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" /> Recent Card Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" /> Recent Card Activity</CardTitle>
        <CardDescription>{transactions.length} conversions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No card activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-[hsl(var(--care-green)/0.1)]">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-[hsl(var(--care-green))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{Number(tx.care_amount).toLocaleString()} CARE → ${Number(tx.usd_amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')} · Fee: ${Number(tx.fee_amount).toFixed(4)}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-[hsl(var(--care-green))] bg-[hsl(var(--care-green)/0.1)] px-2 py-0.5 rounded-full">{tx.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
