import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { toast } from '@/hooks/use-toast';
import {
  QrCode, Scan, CheckCircle2, AlertCircle, Wallet, ArrowRight, Loader2,
} from 'lucide-react';

export default function PatientPay() {
  const { isConnected, address, earnedBalance, totalBalance } = useWallet();
  const [searchParams] = useSearchParams();
  const [payTo, setPayTo] = useState(searchParams.get('to') || '');
  const [payAmount, setPayAmount] = useState(searchParams.get('amount') || '');
  const [payMemo, setPayMemo] = useState(searchParams.get('memo') || '');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  // Parse QR data from URL params (provider embeds these in their QR code)
  const hasQrData = Boolean(payTo && payAmount);
  const amount = parseFloat(payAmount) || 0;
  const canPay = amount > 0 && payTo && totalBalance >= amount;

  const handlePay = async () => {
    if (!canPay) return;
    setPaying(true);
    try {
      // Simulated payment — in production this would call a smart contract transfer
      await new Promise((r) => setTimeout(r, 2000));
      setPaid(true);
      toast({
        title: 'Payment Sent!',
        description: `${amount.toLocaleString()} CARE sent successfully.`,
      });
    } catch (err) {
      toast({ title: 'Payment Failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-16 text-center space-y-6 animate-fade-in-up">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[hsl(var(--care-teal)/0.2)] to-[hsl(var(--care-green)/0.2)] flex items-center justify-center">
            <QrCode className="h-10 w-10 text-[hsl(var(--care-teal))]" />
          </div>
          <h1 className="text-2xl font-bold">Pay Invoice</h1>
          <p className="text-muted-foreground">Connect your wallet to pay healthcare invoices with CARE tokens.</p>
          <ConnectWalletButton />
        </div>
      </DashboardLayout>
    );
  }

  if (paid) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md py-16 text-center space-y-6 animate-fade-in-up">
          <div className="mx-auto h-20 w-20 rounded-full bg-[hsl(var(--care-green)/0.15)] flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-[hsl(var(--care-green))]" />
          </div>
          <h1 className="text-2xl font-bold">Payment Complete</h1>
          <p className="text-muted-foreground">{amount.toLocaleString()} CARE sent to <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{payTo.slice(0, 8)}…{payTo.slice(-6)}</code></p>
          {payMemo && <p className="text-sm text-muted-foreground">Memo: {payMemo}</p>}
          <Button variant="outline" onClick={() => { setPaid(false); setPayTo(''); setPayAmount(''); setPayMemo(''); }}>
            Make Another Payment
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Pay Invoice</h1>
          <p className="text-muted-foreground">Pay a healthcare invoice using CARE tokens</p>
        </div>

        {/* Balance card */}
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-[hsl(var(--care-teal))]" />
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-lg font-bold text-[hsl(var(--care-teal))]">{totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {hasQrData ? <Scan className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
              {hasQrData ? 'Confirm Payment' : 'Enter Payment Details'}
            </CardTitle>
            <CardDescription>
              {hasQrData ? 'Review the invoice details below and confirm' : 'Enter the provider wallet and amount, or scan a QR code'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider Wallet Address</label>
              <Input placeholder="0x..." value={payTo} onChange={(e) => setPayTo(e.target.value)} disabled={hasQrData} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (CARE)</label>
              <Input type="number" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} disabled={hasQrData} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memo (optional)</label>
              <Input placeholder="Invoice #, service description..." value={payMemo} onChange={(e) => setPayMemo(e.target.value)} />
            </div>

            {amount > totalBalance && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Insufficient balance. You need {(amount - totalBalance).toLocaleString()} more CARE.
              </div>
            )}

            <Button className="w-full" variant="gradient" disabled={!canPay || paying} onClick={handlePay}>
              {paying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>Pay {amount > 0 ? `${amount.toLocaleString()} CARE` : ''} <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How QR Payments Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">1</Badge>
              <p>Your provider generates a QR code with their wallet address and bill amount.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">2</Badge>
              <p>Scan the QR code or open the payment link — it auto-fills this form.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">3</Badge>
              <p>Review and confirm the payment with your connected wallet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
