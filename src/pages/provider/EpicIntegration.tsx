import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link2, Check, Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react';

interface EhrIntegration {
  id: string;
  integration_type: string;
  client_id: string;
  webhook_secret: string | null;
  fhir_base_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function EpicIntegration() {
  const { entity, isConnected } = useWallet();
  const [integration, setIntegration] = useState<EhrIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [clientId, setClientId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [fhirBaseUrl, setFhirBaseUrl] = useState('');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/epic-webhook`;

  useEffect(() => {
    if (entity?.id) {
      fetchIntegration();
    }
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

    if (!error && data) {
      setIntegration(data as EhrIntegration);
      setClientId(data.client_id);
      setWebhookSecret(data.webhook_secret || '');
      setFhirBaseUrl(data.fhir_base_url || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!entity?.id || !clientId) {
      toast({ title: 'Error', description: 'Client ID is required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const integrationData = {
      entity_id: entity.id,
      integration_type: 'epic',
      client_id: clientId,
      webhook_secret: webhookSecret || null,
      fhir_base_url: fhirBaseUrl || null,
      is_active: true,
    };

    let result;
    if (integration) {
      result = await supabase
        .from('ehr_integrations')
        .update(integrationData)
        .eq('id', integration.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('ehr_integrations')
        .insert(integrationData)
        .select()
        .single();
    }

    if (result.error) {
      toast({ title: 'Error', description: 'Failed to save integration', variant: 'destructive' });
    } else {
      setIntegration(result.data as EhrIntegration);
      toast({ title: 'Success', description: 'Epic integration saved!' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!integration) return;

    const { error } = await supabase
      .from('ehr_integrations')
      .delete()
      .eq('id', integration.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete integration', variant: 'destructive' });
    } else {
      setIntegration(null);
      setClientId('');
      setWebhookSecret('');
      setFhirBaseUrl('');
      toast({ title: 'Deleted', description: 'Epic integration removed' });
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Epic Integration</h1>
          <p className="text-muted-foreground">
            Connect your Epic EHR to automatically earn CareCoin rewards for documentation events.
          </p>
        </div>

        {/* Webhook URL Card */}
        <Card className="card-glow-teal border-border/40 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Webhook URL
            </CardTitle>
            <CardDescription>
              Configure this URL in your Epic system to send documentation events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Epic will POST events to this URL when documentation is created.
            </p>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card className="card-shadow border-border/40 bg-gradient-to-br from-card via-card to-accent/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Epic Credentials</CardTitle>
                <CardDescription>
                  Enter your Epic developer credentials from the Epic App Orchard.
                </CardDescription>
              </div>
              {integration && (
                <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                  {integration.is_active ? 'Active' : 'Inactive'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter your Epic Client ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
              <Input
                id="webhookSecret"
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="For signature verification"
              />
              <p className="text-xs text-muted-foreground">
                Used to verify webhook requests are from Epic.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fhirBaseUrl">FHIR Base URL (Optional)</Label>
              <Input
                id="fhirBaseUrl"
                value={fhirBaseUrl}
                onChange={(e) => setFhirBaseUrl(e.target.value)}
                placeholder="https://fhir.epic.com/..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving || !clientId}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {integration ? 'Update Integration' : 'Connect Epic'}
              </Button>
              {integration && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supported Events Card */}
        <Card className="card-shadow border-border/40 bg-gradient-to-br from-card via-card to-care-green/5">
          <CardHeader>
            <CardTitle className="text-lg">Supported Events</CardTitle>
            <CardDescription>
              These Epic events will automatically generate CARE token rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
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
              ].map((item) => (
                <div key={item.event} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/40 p-2 shadow-[var(--shadow-card)] transition-colors hover:bg-muted/60">
                  <Check className="h-4 w-4 text-care-green" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Link */}
        <Card className="border-dashed border-border/50 bg-gradient-to-r from-card to-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Need help setting up?</p>
                <p className="text-sm text-muted-foreground">
                  View our Epic integration documentation
                </p>
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
