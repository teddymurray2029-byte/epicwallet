import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Check, ExternalLink, Loader2, Unplug, Zap, ShieldCheck, Activity, AlertTriangle, Link } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

type EhrType = 'epic' | 'pointclickcare';

const EHR_CONFIG: Record<EhrType, { label: string; shortLabel: string; authFunction: string; docsUrl: string; docsLabel: string; color: string }> = {
  epic: {
    label: 'Epic',
    shortLabel: 'Epic',
    authFunction: 'epic-auth',
    docsUrl: 'https://fhir.epic.com/',
    docsLabel: 'Epic FHIR Docs',
    color: 'hsl(var(--care-blue))',
  },
  pointclickcare: {
    label: 'PointClickCare',
    shortLabel: 'PCC',
    authFunction: 'pointclickcare-auth',
    docsUrl: 'https://developer.pointclickcare.com/',
    docsLabel: 'PCC Developer Docs',
    color: 'hsl(var(--care-teal))',
  },
};

export default function EhrIntegration() {
  const { entity, isConnected } = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();
  const [integrations, setIntegrations] = useState<Record<EhrType, EhrIntegration | null>>({ epic: null, pointclickcare: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<EhrType | null>(null);
  const [disconnecting, setDisconnecting] = useState<EhrType | null>(null);
  const [notConfigured, setNotConfigured] = useState<EhrType | null>(null);
  const [autoConnectTriggered, setAutoConnectTriggered] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('connected') === 'epic') {
      toast({ title: 'Connected!', description: 'Epic EHR is now connected and receiving notifications.' });
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('connected') === 'pcc') {
      toast({ title: 'Connected!', description: 'PointClickCare is now connected and receiving notifications.' });
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('error')) {
      toast({ title: 'Connection Failed', description: `Error: ${searchParams.get('error')}`, variant: 'destructive' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Magic link auto-connect: ?connect=epic or ?connect=pcc
  useEffect(() => {
    const connectParam = searchParams.get('connect');
    const ehrType: EhrType | null = connectParam === 'epic' || connectParam === 'true' ? 'epic' : connectParam === 'pcc' ? 'pointclickcare' : null;
    if (
      ehrType &&
      !autoConnectTriggered &&
      !loading &&
      !integrations[ehrType] &&
      entity?.id &&
      isConnected
    ) {
      setAutoConnectTriggered(true);
      setSearchParams({}, { replace: true });
      handleConnect(ehrType);
    }
  }, [searchParams, loading, integrations, entity?.id, isConnected, autoConnectTriggered]);

  useEffect(() => {
    if (entity?.id) fetchIntegrations();
  }, [entity?.id]);

  const fetchIntegrations = async () => {
    if (!entity?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ehr_integrations')
      .select('*')
      .eq('entity_id', entity.id)
      .in('integration_type', ['epic', 'pointclickcare']);

    const result: Record<EhrType, EhrIntegration | null> = { epic: null, pointclickcare: null };
    if (!error && data) {
      for (const row of data) {
        if (row.is_active && (row.integration_type === 'epic' || row.integration_type === 'pointclickcare')) {
          result[row.integration_type as EhrType] = row as EhrIntegration;
        }
      }
    }
    setIntegrations(result);
    setLoading(false);
  };

  const handleConnect = async (type: EhrType) => {
    if (!entity?.id) return;
    setConnecting(type);
    const cfg = EHR_CONFIG[type];
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${cfg.authFunction}?action=authorize&entity_id=${entity.id}`);
      const data = await res.json();
      if (data.configured === false) {
        setNotConfigured(type);
        setConnecting(null);
        return;
      }
      if (data.authorize_url) {
        window.location.href = data.authorize_url;
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to start connection', variant: 'destructive' });
        setConnecting(null);
      }
    } catch {
      toast({ title: 'Error', description: `Failed to connect to ${cfg.label}`, variant: 'destructive' });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (type: EhrType) => {
    if (!entity?.id) return;
    setDisconnecting(type);
    const cfg = EHR_CONFIG[type];
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${cfg.authFunction}?action=disconnect&entity_id=${entity.id}`);
      const data = await res.json();
      if (data.success) {
        setIntegrations(prev => ({ ...prev, [type]: null }));
        toast({ title: 'Disconnected', description: `${cfg.label} has been disconnected.` });
      } else {
        toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
    setDisconnecting(null);
  };

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Connect your wallet to access EHR integrations.</p>
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

  const renderEhrCard = (type: EhrType, index: number) => {
    const cfg = EHR_CONFIG[type];
    const integration = integrations[type];
    const magicParam = type === 'epic' ? 'epic' : 'pcc';

    if (integration) {
      return (
        <Card key={type} variant="glow" className="bg-gradient-to-br from-card via-card to-accent/10 animate-fade-in-up" style={{ animationDelay: `${80 + index * 80}ms` }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">{cfg.label} Connected</CardTitle>
                  <CardDescription>Actively sending notifications</CardDescription>
                </div>
              </div>
              <Badge className="status-success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--care-green))]" />
                Your System
              </div>
              <div className="relative h-0.5 w-16 bg-[hsl(var(--care-green)/0.3)] overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--care-green))] to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--care-green))]" />
                {cfg.label}
              </div>
            </div>
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
            <Button variant="destructive" onClick={() => handleDisconnect(type)} loading={disconnecting === type} className="w-full">
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect {cfg.label}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={type} className="shimmer-border bg-gradient-to-br from-card via-card to-primary/5 animate-fade-in-up" style={{ animationDelay: `${80 + index * 80}ms` }}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Connect to {cfg.label}</CardTitle>
          <CardDescription className="max-w-sm mx-auto">
            Link your {cfg.label} EHR to automatically earn CARE tokens for documentation events.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          <Button size="lg" variant="gradient" className="w-full text-base h-12" onClick={() => handleConnect(type)} loading={connecting === type}>
            <Activity className="mr-2 h-5 w-5" />
            {connecting === type ? 'Connecting...' : `Connect to ${cfg.label}`}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to {cfg.label} to authorize access.
          </p>
          <div className="pt-3 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const magicLink = `${window.location.origin}/provider/ehr?connect=${magicParam}`;
                navigator.clipboard.writeText(magicLink);
                toast({ title: 'Magic Link Copied!', description: `Share this link to instantly start ${cfg.label} connection.` });
              }}
            >
              <Link className="mr-2 h-4 w-4" />
              Copy Magic Link
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Share this link to auto-start the {cfg.label} connection flow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">EHR Integration</h1>
          <p className="text-muted-foreground">
            Connect your EHR system to automatically earn CareWallet rewards for documentation events.
          </p>
        </div>

        {/* Not Configured Alerts */}
        {notConfigured === 'epic' && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Epic Integration Not Yet Configured</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your administrator hasn't set up Epic OAuth credentials yet.</p>
              <p className="text-xs text-muted-foreground">
                Ask your organization admin to enter Epic Client ID and Client Secret on the{' '}
                <a href="/admin/organizations" className="text-primary underline">Organization Management</a> page.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {notConfigured === 'pointclickcare' && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>PointClickCare Integration Not Yet Configured</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your administrator hasn't set up PointClickCare OAuth credentials yet.</p>
              <p className="text-xs text-muted-foreground">
                Ask your organization admin to enter PCC Client ID and Client Secret on the{' '}
                <a href="/admin/organizations" className="text-primary underline">Organization Management</a> page.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* EHR Connection Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {(['epic', 'pointclickcare'] as EhrType[]).map((type, i) => renderEhrCard(type, i))}
        </div>

        {/* Supported Events */}
        <Card className="border-border/40 bg-gradient-to-br from-card via-card to-accent/5 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Supported Events</CardTitle>
            <CardDescription>These EHR events will automatically generate CARE token rewards.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {SUPPORTED_EVENTS.map((item, index) => (
                <div key={item.event} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 p-2.5 card-interactive" style={{ animation: `scale-pop 0.3s ease-out ${index * 40}ms both` }}>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Links */}
        <Card className="border-dashed border-border/50 bg-gradient-to-r from-card to-muted/30 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium">Need help setting up?</p>
                <p className="text-sm text-muted-foreground">View integration documentation</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://fhir.epic.com/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Epic Docs
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://developer.pointclickcare.com/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    PCC Docs
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
