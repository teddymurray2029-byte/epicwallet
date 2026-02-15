import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, ExternalLink, Loader2, Unplug, Zap, ShieldCheck, Activity } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

interface EhrIntegration {
  id: string;
  integration_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subscription_id: string | null;
  token_expires_at: string | null;
}

const SUPPORTED_EVENTS = [
  { event: 'encounter.complete', label: 'Encounter Note' },
  { event: 'medication.reconciliation', label: 'Medication Reconciliation' },
  { event: 'discharge.summary', label: 'Discharge Summary' },
  { event: 'problem.update', label: 'Problem List Update' },
  { event: 'order.verified', label: 'Orders Verified' },
  { event: 'preventive.care', label: 'Preventive Care' },
  { event: 'coding.finalized', label: 'Coding Finalized' },
  { event: 'intake.completed', label: 'Intake Completed' },
  { event: 'consent.signed', label: 'Consent Signed' },
  { event: 'followup.completed', label: 'Follow-up Completed' },
];

export default function EpicIntegration() {
  const { entity, isConnected } = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integration, setIntegration] = useState<EhrIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast({ title: 'Connected!', description: 'Epic EHR is now connected and receiving notifications.' });
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('error')) {
      toast({ title: 'Connection Failed', description: `Error: ${searchParams.get('error')}`, variant: 'destructive' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (entity?.id) fetchIntegration();
  }, [entity?.id]);

  const fetchIntegration = async () => {
    if (!entity?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ehr_integrations')
      .select('*')
      .eq('entity_id', entity.id)
      .eq('integration_type', 'epic')
      .maybeSingle();

    if (!error && data && data.is_active) {
      setIntegration(data as EhrIntegration);
    } else {
      setIntegration(null);
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!entity?.id) return;
    setConnecting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/epic-auth?action=authorize&entity_id=${entity.id}`,
      );
      const data = await res.json();
      if (data.authorize_url) {
        window.location.href = data.authorize_url;
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to start connection', variant: 'destructive' });
        setConnecting(false);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to connect to Epic', variant: 'destructive' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!entity?.id) return;
    setDisconnecting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/epic-auth?action=disconnect&entity_id=${entity.id}`,
      );
      const data = await res.json();
      if (data.success) {
        setIntegration(null);
        toast({ title: 'Disconnected', description: 'Epic EHR has been disconnected.' });
      } else {
        toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
    setDisconnecting(false);
  };

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Connect your wallet to access Epic integration.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold tracking-tight text-gradient-hero inline-block">Epic Integration</h1>
          <p className="text-muted-foreground">
            Connect your Epic EHR to automatically earn CareCoin rewards for documentation events.
          </p>
        </div>

        {/* Connection Card */}
        {integration ? (
          <Card className="shimmer-border card-glow-green bg-gradient-to-br from-card via-card to-accent/10 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Epic Connected</CardTitle>
                    <CardDescription>Your EHR is actively sending notifications</CardDescription>
                  </div>
                </div>
                <Badge className="status-success">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Connected Since</p>
                  <p className="font-medium">{new Date(integration.created_at).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs">Subscription</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <p className="font-medium">{integration.subscription_id ? 'Active' : 'Pending'}</p>
                  </div>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting} className="w-full">
                {disconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
                Disconnect Epic
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shimmer-border card-glow-teal bg-gradient-to-br from-card via-card to-primary/5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Connect to Epic</CardTitle>
              <CardDescription className="max-w-sm mx-auto">
                One click to link your Epic EHR. We'll automatically receive documentation events and reward you with CARE tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                size="lg"
                className="w-full text-base h-12"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Activity className="mr-2 h-5 w-5" />
                )}
                {connecting ? 'Connecting...' : 'Connect to Epic'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                You'll be redirected to Epic to authorize access. No credentials needed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Supported Events Card */}
        <Card className="card-shadow border-border/40 bg-gradient-to-br from-card via-card to-accent/5 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Supported Events</CardTitle>
            <CardDescription>
              These Epic events will automatically generate CARE token rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {SUPPORTED_EVENTS.map((item, index) => (
                <div key={item.event} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 p-2.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:bg-muted/50 hover:shadow-[var(--shadow-card-hover)]" style={{ animation: `scale-pop 0.3s ease-out ${index * 40}ms both` }}>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Link */}
        <Card className="border-dashed border-border/50 bg-gradient-to-r from-card to-muted/30 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Need help setting up?</p>
                <p className="text-sm text-muted-foreground">View our Epic integration documentation</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="https://fhir.epic.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Epic FHIR Docs
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
