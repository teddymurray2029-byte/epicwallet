import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Banknote,
  CreditCard,
  Building2,
  ArrowRight,
  Coins,
  DollarSign,
  ArrowRightLeft,
  Wallet,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function FiatOfframp() {
  const { isConnected, entity, earnedBalance, onChainBalance, totalBalance } = useWallet();
  const [convertAmount, setConvertAmount] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const usdRate = 0.01;

  // Bank transfer state
  const [bankStatus, setBankStatus] = useState<{
    connected: boolean;
    payouts_enabled: boolean;
    onboarding_complete: boolean;
  } | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (entity?.id) checkBankStatus();
  }, [entity?.id]);

  // Check onboarding return
  useEffect(() => {
    if (searchParams.get('onboarding') === 'complete' && entity?.id) {
      checkBankStatus();
      toast.success('Onboarding complete! Checking your account status...');
    }
  }, [searchParams, entity?.id]);

  const checkBankStatus = async () => {
    if (!entity?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'check-status', entity_id: entity.id, wallet_address: entity.wallet_address },
      });
      if (error) throw error;
      setBankStatus(data);
    } catch {
      setBankStatus({ connected: false, payouts_enabled: false, onboarding_complete: false });
    }
  };

  const handleConnectBank = async () => {
    if (!entity?.id) return;
    setBankLoading(true);
    try {
      const action = bankStatus?.connected ? 'onboarding-link' : 'create-account';
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action, entity_id: entity.id, wallet_address: entity.wallet_address },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to start bank connection');
    } finally {
      setBankLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0 || !entity?.id) return;
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'withdraw', entity_id: entity.id, wallet_address: entity.wallet_address, care_amount: amt },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Withdrew $${data.usd_amount.toFixed(2)} USD to your bank account!`);
      setWithdrawAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-6">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
              <p className="text-muted-foreground">Connect your wallet to access cash out options.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const amount = parseFloat(convertAmount) || 0;
  const usdGross = amount * usdRate;
  const fee = usdGross * 0.01;
  const usdNet = usdGross - fee;

  const wAmt = parseFloat(withdrawAmount) || 0;
  const wGross = wAmt * usdRate;
  const wFee = wGross * 0.01;
  const wNet = wGross - wFee;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cash Out</h1>
          <p className="text-muted-foreground">Convert your CARE tokens to USD</p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Earned Balance', value: earnedBalance, icon: Coins, color: 'text-primary' },
            { label: 'On-Chain Balance', value: onChainBalance, icon: Wallet, color: 'text-primary' },
            { label: 'Total Available', value: totalBalance, icon: DollarSign, color: 'text-primary' },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>
                      {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Conversion Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Conversion Calculator
            </CardTitle>
            <CardDescription>1 CARE = ${usdRate} USD · 1% network fee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (CARE)</label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  min="0"
                  step="1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={() => setConvertAmount(String(totalBalance))}
                >
                  MAX
                </Button>
              </div>
            </div>

            {amount > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross USD</span>
                  <span>${usdGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network fee (1%)</span>
                  <span>-${fee.toFixed(4)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                  <span>You receive</span>
                  <span className="text-primary">${usdNet.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Off-Ramp Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Virtual Card */}
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-primary transition-all"
            onClick={() => navigate('/provider/card')}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Load Virtual Card</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Convert CARE to USD and load onto your virtual Visa card. Spend anywhere Visa is accepted.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                    Go to Virtual Card <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Transfer */}
          <Card className="border-2 border-transparent hover:border-primary transition-all">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Bank Transfer</h3>
                    {bankStatus?.payouts_enabled && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Withdraw CARE directly to your bank account via ACH transfer.
                  </p>

                  {!bankStatus?.connected ? (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={handleConnectBank}
                      disabled={bankLoading}
                    >
                      {bankLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                      Connect Bank Account
                    </Button>
                  ) : !bankStatus.payouts_enabled ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleConnectBank}
                      disabled={bankLoading}
                    >
                      {bankLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                      Complete Onboarding
                    </Button>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            placeholder="CARE amount"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            min="0"
                            step="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                            onClick={() => setWithdrawAmount(String(totalBalance))}
                          >
                            MAX
                          </Button>
                        </div>
                        <Button
                          onClick={handleWithdraw}
                          disabled={withdrawing || wAmt <= 0}
                        >
                          {withdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Withdraw'}
                        </Button>
                      </div>
                      {wAmt > 0 && (
                        <p className="text-xs text-muted-foreground">
                          You'll receive <span className="font-medium text-foreground">${wNet.toFixed(2)}</span> USD after 1% fee
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Daily Limit Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 text-sm">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Daily Conversion Limit</p>
                <p className="text-xs text-muted-foreground">Maximum 50,000 CARE per day per account for security purposes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
