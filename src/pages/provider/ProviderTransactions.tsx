import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/WalletContext';
import { useTransactionHistory } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Search, ExternalLink, ArrowDownLeft, Wallet, Copy, Download } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { MOCK_TRANSACTION_HISTORY } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';

export default function ProviderTransactions() {
  const { entity, isConnected, earnedBalance, earnedBalanceLoading } = useWallet();
  const { data: transactions, isLoading, error, refetch } = useTransactionHistory();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view transactions.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isMock = !isLoading && !error && (!transactions || transactions.length === 0);
  const displayTransactions = isMock ? MOCK_TRANSACTION_HISTORY : (transactions || []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-[hsl(var(--care-green))] text-primary-foreground gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 inline-block" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-[hsl(var(--care-warning))] text-[hsl(var(--care-warning))] gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--care-warning))] inline-block animate-pulse" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredTransactions = displayTransactions.filter((tx) => {
    if (!searchQuery) return true;
    return (
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.txHash && tx.txHash.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const truncateHash = (hash: string | null) => {
    if (!hash) return '—';
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: 'Copied', description: 'Transaction hash copied to clipboard.' });
  };

  const totalConfirmed = displayTransactions.filter((tx) => tx.status === 'confirmed').reduce((sum, tx) => sum + tx.amount, 0);
  const totalPending = displayTransactions.filter((tx) => tx.status === 'pending').reduce((sum, tx) => sum + tx.amount, 0);

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Amount (CARE)', 'Status', 'TX Hash'];
    const rows = filteredTransactions.map((tx) => [
      format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm'),
      `${tx.recipientType} Reward`,
      tx.amount.toString(),
      tx.status,
      tx.txHash || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carecoin-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Earned Balance', value: isMock ? 1247.50 : earnedBalance, loading: isMock ? false : earnedBalanceLoading, icon: Wallet, color: 'text-[hsl(var(--care-teal))]', bgColor: 'bg-[hsl(var(--care-teal)/0.1)]', borderColor: 'border-t-[hsl(var(--care-teal))]' },
    { label: 'Total Received', value: totalConfirmed, loading: false, icon: ArrowDownLeft, color: 'text-[hsl(var(--care-green))]', bgColor: 'bg-[hsl(var(--care-green)/0.1)]', borderColor: 'border-t-[hsl(var(--care-green))]' },
    { label: 'Pending', value: totalPending, loading: false, icon: Receipt, color: 'text-[hsl(var(--care-warning))]', bgColor: 'bg-[hsl(var(--care-warning)/0.1)]', borderColor: 'border-t-[hsl(var(--care-warning))]' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="page-header inline-block">Transactions</h1>
            <p className="text-muted-foreground">View your complete transaction history</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--care-green))]" /> <span><strong>Confirmed</strong> — On-chain and finalized</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--care-warning))]" /> <span><strong>Pending</strong> — Awaiting blockchain confirmation</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> <span><strong>Rejected</strong> — Did not pass validation</span></div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card, index) => (
            <Card key={card.label} className={`border-t-2 ${card.borderColor} card-interactive ${isMock ? 'opacity-75' : ''}`} style={{ animation: `fade-in-up 0.4s ease-out ${index * 80}ms both` }}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bgColor} ring-1 ring-border/20 shadow-sm`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    {card.loading ? <Skeleton className="h-6 w-24" /> : (
                      <p className={`text-xl font-bold ${card.color}`}>{card.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isMock && <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Showing Sample Data — earn rewards to see real transactions</Badge>}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by ID or transaction hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Transactions List */}
        <Card className={isMock ? 'opacity-75' : ''}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>{filteredTransactions.length} transactions found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b">
                    <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive"><p>Failed to load transactions</p></div>
            ) : filteredTransactions.length > 0 ? (
              <div className="divide-y divide-border/30 row-striped">
                {filteredTransactions.map((tx, index) => (
                  <div
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3 rounded-lg px-3 -mx-3 transition-all duration-200 hover:bg-muted/40 hover:shadow-sm"
                    style={{ animation: `fade-in-up 0.3s ease-out ${Math.min(index, 10) * 40}ms both` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--care-green)/0.1)] ring-1 ring-[hsl(var(--care-green)/0.2)]">
                        <ArrowDownLeft className="h-4 w-4 text-[hsl(var(--care-green))]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium capitalize">{tx.recipientType} Reward</span>
                          {getStatusBadge(tx.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}</span>
                          {tx.confirmedAt && (
                            <>
                              <span>•</span>
                              <span>Confirmed {formatDistanceToNow(new Date(tx.confirmedAt), { addSuffix: true })}</span>
                            </>
                          )}
                        </div>
                        {tx.txHash && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <code className="text-xs font-mono bg-muted/60 px-2.5 py-1 rounded-md border border-border/30">{truncateHash(tx.txHash)}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyHash(tx.txHash!)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`https://polygonscan.com/tx/${tx.txHash}`, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-11 sm:pl-0">
                      <p className="font-bold text-[hsl(var(--care-teal))] text-lg">
                        +{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-muted-foreground">No matching transactions</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
