import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import {
  CreditCard,
  ArrowRightLeft,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Snowflake,
  DollarSign,
  Coins,
  Loader2,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { CardActivityTable } from '@/components/provider/CardActivityTable';

const stripePromise = loadStripe('pk_live_51StvAPRzNLUIpDoyMwf5quZ4u9fhuX9Y4ilK1gdEhiEjfTWwjDOVk0icp1G7kQXDYYjf0Q1pKZXV0CRDThH5hKN800mCtFBlLR');

interface VirtualCardData {
  id: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  brand: string;
  status: 'active' | 'inactive' | 'frozen';
  spending_limit: number;
  usd_balance: number;
}

// Stripe Elements handles card detail display securely

export default function VirtualCard() {
  const { isConnected, entity, earnedBalance, onChainBalance, address } = useWallet();
  const [card, setCard] = useState<VirtualCardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const numberRef = useRef<HTMLDivElement>(null);
  const cvcRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<any>(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [usdRate] = useState(0.01); // 1 CARE = $0.01 placeholder rate

  // Simulated card data for UI demonstration
  // In production, this would come from Stripe Issuing API via edge function
  useEffect(() => {
    if (entity?.id) {
      loadCard();
    }
  }, [entity?.id]);

  const loadCard = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('virtual-card', {
        body: { action: 'get', entity_id: entity?.id, wallet_address: address },
      });

      if (response.data?.card) {
        setCard(response.data.card);
      }
    } catch (err) {
      console.error('Error loading card:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!entity?.id) return;
    setCreating(true);
    try {
      const response = await supabase.functions.invoke('virtual-card', {
        body: { action: 'create', entity_id: entity.id, wallet_address: address },
      });

      if (response.data?.card) {
        setCard(response.data.card);
        toast.success('Virtual Visa card created!');
      } else {
        toast.error(response.data?.error || 'Failed to create card');
      }
    } catch (err) {
      toast.error('Failed to create virtual card');
    } finally {
      setCreating(false);
    }
  };

  const handleConvert = async () => {
    const amount = parseFloat(convertAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > onChainBalance) {
      toast.error('Insufficient CARE balance');
      return;
    }
    setConverting(true);
    try {
      const response = await supabase.functions.invoke('virtual-card', {
        body: {
          action: 'convert',
          entity_id: entity?.id,
          wallet_address: address,
          care_amount: amount,
        },
      });

      if (response.data?.success) {
        const usdAmount = (amount * usdRate).toFixed(2);
        toast.success(`Converted ${amount} CARE → ${usdAmount} USDC → $${usdAmount} USD`);
        setConvertAmount('');
        loadCard(); // Refresh balance
      } else {
        toast.error(response.data?.error || 'Conversion failed');
      }
    } catch (err) {
      toast.error('Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const handleReveal = async () => {
    if (!entity?.id || !card) return;

    // Toggle off
    if (showDetails) {
      // Unmount elements
      if (elementsRef.current) {
        elementsRef.current = null;
      }
      if (numberRef.current) numberRef.current.innerHTML = '';
      if (cvcRef.current) cvcRef.current.innerHTML = '';
      if (expiryRef.current) expiryRef.current.innerHTML = '';
      setShowDetails(false);
      return;
    }

    setRevealing(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      // 1. Create nonce
      const nonceResult = await stripe.createEphemeralKeyNonce({ issuingCard: card.id });
      if (nonceResult.error) throw new Error(nonceResult.error.message);

      // 2. Get ephemeral key from backend
      const response = await supabase.functions.invoke('virtual-card', {
        body: { action: 'ephemeral-key', entity_id: entity.id, wallet_address: address, nonce: nonceResult.nonce },
      });

      if (response.error || !response.data) throw new Error(response.data?.error || 'Failed to get ephemeral key');
      if (response.data.error) throw new Error(response.data.error);

      const ephemeralKeySecret = response.data.ephemeralKeySecret;
      const cardId = response.data.cardId;
      if (!ephemeralKeySecret) throw new Error('Ephemeral key secret is missing');

      // 3. Create Stripe Elements and mount
      const elements = stripe.elements();
      elementsRef.current = elements;

      const style = { base: { color: '#ffffff', fontSize: '16px', fontFamily: 'monospace' } };

      const numberEl = elements.create('issuingCardNumberDisplay', {
        issuingCard: cardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret,
        style,
      });

      const cvcEl = elements.create('issuingCardCvcDisplay', {
        issuingCard: cardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret,
        style,
      });

      const expiryEl = elements.create('issuingCardExpiryDisplay', {
        issuingCard: cardId,
        nonce: nonceResult.nonce,
        ephemeralKeySecret,
        style,
      });

      if (numberRef.current) numberEl.mount(numberRef.current);
      if (cvcRef.current) cvcEl.mount(cvcRef.current);
      if (expiryRef.current) expiryEl.mount(expiryRef.current);

      setShowDetails(true);
    } catch (err: any) {
      console.error('Reveal error:', err);
      toast.error(err.message || 'Failed to reveal card details');
    } finally {
      setRevealing(false);
    }
  };

  const handleFreeze = async () => {
    if (!card) return;
    try {
      const newStatus = card.status === 'frozen' ? 'active' : 'frozen';
      const response = await supabase.functions.invoke('virtual-card', {
        body: { action: newStatus === 'frozen' ? 'freeze' : 'unfreeze', entity_id: entity?.id, card_id: card.id },
      });

      if (response.data?.success) {
        setCard({ ...card, status: newStatus });
        toast.success(newStatus === 'frozen' ? 'Card frozen' : 'Card unfrozen');
      }
    } catch (err) {
      toast.error('Failed to update card status');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-6">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
              <p className="text-muted-foreground">Connect your wallet to access your virtual Visa card.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Virtual Visa Card</h1>
          <p className="text-muted-foreground">Spend your CARE tokens anywhere Visa is accepted</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Virtual Card Display */}
          <div className="space-y-4">
            {loading ? (
              <Card className="h-56 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </Card>
            ) : card ? (
              <>
                {/* Card Visual */}
                <div className="relative h-56 rounded-2xl bg-gradient-to-br from-[hsl(var(--care-blue))] via-[hsl(var(--care-teal))] to-[hsl(var(--care-green))] p-6 text-white shadow-xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-16" />
                  
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-80">CareWallet</p>
                        <p className="text-sm font-medium opacity-90">Virtual Card</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {card.status === 'frozen' && (
                          <Badge variant="outline" className="border-white/40 text-white text-xs">
                            <Snowflake className="h-3 w-3 mr-1" /> Frozen
                          </Badge>
                        )}
                        <Shield className="h-5 w-5 opacity-80" />
                      </div>
                    </div>

                    <div>
                      {showDetails ? (
                        <div className="space-y-1">
                          <div ref={numberRef} className="text-xl tracking-[0.25em] font-mono min-h-[28px]" />
                          <div className="flex items-center gap-2 text-sm font-mono opacity-80">
                            <span>CVC:</span>
                            <div ref={cvcRef} className="inline-block min-w-[40px]" />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xl tracking-[0.25em] font-mono">
                          {`•••• •••• •••• ${card.last4}`}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs uppercase opacity-60">Expires</p>
                        {showDetails ? (
                          <div ref={expiryRef} className="text-sm font-mono min-h-[20px]" />
                        ) : (
                          <p className="text-sm font-mono">
                            {`${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase opacity-60">Balance</p>
                        <p className="text-lg font-bold">${card.usd_balance.toFixed(2)}</p>
                      </div>
                      <svg viewBox="0 0 48 32" className="h-8 w-auto opacity-90" fill="none">
                        <rect width="48" height="32" rx="4" fill="white" fillOpacity="0.2" />
                        <text x="6" y="22" fontFamily="monospace" fontSize="14" fontWeight="bold" fill="white">VISA</text>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReveal}
                    disabled={revealing}
                    className="flex-1"
                  >
                    {revealing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : showDetails ? (
                      <EyeOff className="h-4 w-4 mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.info('Card number is displayed securely via Stripe — use your browser to copy it.');
                    }}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy Number
                  </Button>
                  <Button
                    variant={card.status === 'frozen' ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleFreeze}
                    className="flex-1"
                  >
                    <Snowflake className="h-4 w-4 mr-2" />
                    {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                  </Button>
                </div>
              </>
            ) : (
              <Card className="h-56 flex items-center justify-center border-dashed border-2">
                <CardContent className="text-center pt-6">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Virtual Card</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a virtual Visa to spend CARE tokens at any point of sale.
                  </p>
                  <Button onClick={handleCreateCard} disabled={creating} variant="gradient">
                    {creating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                    ) : (
                      <><CreditCard className="h-4 w-4 mr-2" /> Create Virtual Card</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Conversion Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowRightLeft className="h-5 w-5" />
                  Convert CARE → USD
                </CardTitle>
                <CardDescription>
                  CARE → USDC (stablecoin bridge) → USD loaded to your card
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conversion Flow Diagram */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div className="text-center">
                    <Coins className="h-5 w-5 mx-auto text-[hsl(var(--care-teal))]" />
                    <p className="text-xs font-medium mt-1">CARE</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <div className="text-center">
                    <div className="h-5 w-5 mx-auto rounded-full bg-[hsl(var(--care-blue))] flex items-center justify-center">
                      <span className="text-[8px] font-bold text-primary-foreground">$</span>
                    </div>
                    <p className="text-xs font-medium mt-1">USDC</p>
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <div className="text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-[hsl(var(--care-green))]" />
                    <p className="text-xs font-medium mt-1">USD</p>
                  </div>
                </div>

                <div className="space-y-3">
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
                        onClick={() => setConvertAmount(String(onChainBalance))}
                      >
                        MAX
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {onChainBalance.toLocaleString()} CARE
                    </p>
                  </div>

                  {convertAmount && parseFloat(convertAmount) > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CARE Amount</span>
                        <span>{parseFloat(convertAmount).toLocaleString()} CARE</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">USDC (bridge)</span>
                        <span>{(parseFloat(convertAmount) * usdRate).toFixed(2)} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network fee (1%)</span>
                        <span>-{(parseFloat(convertAmount) * usdRate * 0.01).toFixed(4)} USDC</span>
                      </div>
                      <div className="border-t border-border pt-1.5 flex justify-between text-sm font-semibold">
                        <span>You receive</span>
                        <span className="text-[hsl(var(--care-green))]">
                          ${(parseFloat(convertAmount) * usdRate * 0.99).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleConvert}
                    disabled={converting || !convertAmount || parseFloat(convertAmount) <= 0 || !card}
                    className="w-full"
                    variant="gradient"
                  >
                    {converting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting...</>
                    ) : (
                      <><ArrowRightLeft className="h-4 w-4 mr-2" /> Convert & Load Card</>
                    )}
                  </Button>

                  {!card && (
                    <p className="text-xs text-center text-muted-foreground">
                      Create a virtual card first to convert CARE to USD
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rate Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Exchange Rate</p>
                    <p className="text-xs text-muted-foreground">1 CARE = {usdRate} USDC = ${usdRate} USD</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Card Activity */}
        {entity?.id && <CardActivityTable entityId={entity.id} />}

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: Coins, title: 'Earn CARE', desc: 'Complete clinical documentation to earn CARE tokens' },
                { icon: ArrowRightLeft, title: 'Convert', desc: 'Bridge CARE → USDC stablecoin → USD at market rate' },
                { icon: CreditCard, title: 'Load Card', desc: 'USD is loaded onto your virtual Visa instantly' },
                { icon: DollarSign, title: 'Spend', desc: 'Use at any point of sale that accepts Visa' },
              ].map((step, i) => (
                <div key={i} className="text-center p-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
