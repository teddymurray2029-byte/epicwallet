import React, { useState } from 'react';
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
  Bell,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FiatOfframp() {
  const { isConnected, entity, earnedBalance, onChainBalance, totalBalance } = useWallet();
  const [convertAmount, setConvertAmount] = useState('');
  const [notifying, setNotifying] = useState(false);
  const navigate = useNavigate();
  const usdRate = 0.01;

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

  const handleNotifyBankTransfer = async () => {
    if (!entity?.id) return;
    setNotifying(true);
    try {
      await supabase.from('system_settings').upsert({
        key: `bank_transfer_interest_${entity.id}`,
        value: { entity_id: entity.id, requested_at: new Date().toISOString() },
      }, { onConflict: 'key' } as any);
      toast.success('You will be notified when bank transfers are available!');
    } catch {
      toast.error('Failed to register interest');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold">Cash Out</h1>
          <p className="text-muted-foreground">Convert your CARE tokens to USD</p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Earned Balance', value: earnedBalance, icon: Coins, color: 'text-[hsl(var(--care-teal))]', bg: 'bg-[hsl(var(--care-teal)/0.1)]' },
            { label: 'On-Chain Balance', value: onChainBalance, icon: Wallet, color: 'text-[hsl(var(--care-blue))]', bg: 'bg-[hsl(var(--care-blue)/0.1)]' },
            { label: 'Total Available', value: totalBalance, icon: DollarSign, color: 'text-[hsl(var(--care-green))]', bg: 'bg-[hsl(var(--care-green)/0.1)]' },
          ].map((item, i) => (
            <Card key={item.label} className="card-interactive" style={{ animation: `fade-in-up 0.4s ease-out ${i * 80}ms both` }}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
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
                  <span className="text-[hsl(var(--care-green))]">${usdNet.toFixed(2)} USD</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Off-Ramp Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Virtual Card */}
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-[hsl(var(--care-teal))] transition-all card-interactive"
            onClick={() => navigate('/provider/card')}
          >
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[hsl(var(--care-teal)/0.1)]">
                  <CreditCard className="h-6 w-6 text-[hsl(var(--care-teal))]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Load Virtual Card</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Convert CARE to USD and load onto your virtual Visa card. Spend anywhere Visa is accepted.
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-sm font-medium text-[hsl(var(--care-teal))]">
                    Go to Virtual Card <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Transfer */}
          <Card className="border-2 border-dashed border-border/60 opacity-75">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Bank Transfer</h3>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">Coming Soon</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Withdraw CARE directly to your bank account via ACH transfer.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={(e) => { e.stopPropagation(); handleNotifyBankTransfer(); }}
                    disabled={notifying}
                  >
                    {notifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                    Notify Me
                  </Button>
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
