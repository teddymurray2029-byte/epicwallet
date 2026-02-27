import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { useTransactionHistory } from '@/hooks/useRewardsData';
import { History, Search, ArrowDownLeft, ExternalLink, Copy, FileDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export default function PatientHistory() {
  const { isConnected } = useWallet();
  const { data: transactions, isLoading, error, refetch } = useTransactionHistory();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view transaction history.</p>
        </div>
      </DashboardLayout>
    );
  }

  const displayTx = transactions || [];
  const filtered = displayTx.filter((tx) => {
    if (!searchQuery) return true;
    return tx.id.toLowerCase().includes(searchQuery.toLowerCase()) || (tx.txHash?.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-[hsl(var(--care-green))] text-primary-foreground">Confirmed</Badge>;
      case 'pending': return <Badge variant="outline" className="border-[hsl(var(--care-warning))] text-[hsl(var(--care-warning))]">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const truncateHash = (hash: string | null) => !hash ? '—' : `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  const downloadReceipt = async (rewardId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: { reward_id: rewardId },
      });
      if (error) throw error;
      const blob = new Blob([data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CareWallet-Receipt-${rewardId.slice(0, 8).toUpperCase()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error', description: 'Failed to download receipt' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="page-header inline-block">Transaction History</h1>
            <p className="text-muted-foreground">All your CARE token transactions</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID or tx hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Transactions</CardTitle>
            <CardDescription>{filtered.length} transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="flex justify-between py-4 border-b"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-24" /></div>)}</div>
            ) : error ? (
              <p className="text-center py-8 text-destructive">Failed to load transactions</p>
            ) : filtered.length > 0 ? (
              <div className="divide-y divide-border/30 row-striped">
                {filtered.map((tx, i) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3 px-3 -mx-3 rounded-lg hover:bg-muted/40 transition-all" style={{ animation: `fade-in-up 0.3s ease-out ${Math.min(i, 10) * 40}ms both` }}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--care-green)/0.1)]"><ArrowDownLeft className="h-4 w-4 text-[hsl(var(--care-green))]" /></div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium capitalize">{tx.recipientType} Reward</span>
                          {getStatusBadge(tx.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}</p>
                        {tx.txHash && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md border border-border/30">{truncateHash(tx.txHash)}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(tx.txHash!); toast({ title: 'Copied' }); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-11 sm:pl-0">
                      <p className="font-bold text-[hsl(var(--care-teal))] text-lg">+{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
                      {tx.status === 'confirmed' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadReceipt(tx.id)} title="Download receipt">
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
