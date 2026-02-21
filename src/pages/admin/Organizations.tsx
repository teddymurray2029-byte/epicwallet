import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { toast } from '@/hooks/use-toast';
import { Copy, Link2, Users, CheckCircle2, Shield, Eye, EyeOff } from 'lucide-react';

const INVITE_EXPIRY_DAYS = 7;

const generateToken = () => {
  if (crypto.randomUUID) return crypto.randomUUID().split('-').join('');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

export default function Organizations() {
  const { entity, entityLoading, isConnected } = useWallet();
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [epicApiUrl, setEpicApiUrl] = useState('');
  const [epicOrganizationId, setEpicOrganizationId] = useState('');
  const [isSavingEpic, setIsSavingEpic] = useState(false);
  const [epicError, setEpicError] = useState<string | null>(null);
  const [epicSaved, setEpicSaved] = useState(false);

  // EHR Credentials state
  const [ehrCreds, setEhrCreds] = useState<Record<string, { client_id: string; client_secret: string }>>({
    epic: { client_id: '', client_secret: '' },
    pointclickcare: { client_id: '', client_secret: '' },
  });
  const [ehrConfigured, setEhrConfigured] = useState<Record<string, boolean>>({ epic: false, pointclickcare: false });
  const [ehrSaving, setEhrSaving] = useState<string | null>(null);
  const [ehrSaved, setEhrSaved] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({ epic: false, pointclickcare: false });

  const organizationId = entity?.entity_type === 'organization' ? entity.id : entity?.organization_id;
  const organizationLabel = entity?.display_name || 'Your organization';
  const isOrganizationOwner = entity?.entity_type === 'organization';
  const canGenerateInvite = Boolean(isConnected && organizationId && isOrganizationOwner);

  const epicMetadata = (entity?.metadata as Record<string, unknown>) || {};

  // Fetch EHR credential status on mount
  useEffect(() => {
    if (!organizationId) return;
    const fetchEhrStatus = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ehr-credentials?organization_id=${organizationId}`
        );
        const data = await res.json();
        if (data.configured) {
          setEhrConfigured(data.configured);
        }
      } catch {
        // silently fail
      }
    };
    fetchEhrStatus();
  }, [organizationId]);
  const epicUrlValue = epicApiUrl || (epicMetadata.epic_api_url as string) || '';
  const epicIdValue = epicOrganizationId || (epicMetadata.epic_organization_id as string) || '';

  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Invite link copied', description: 'Share this link with your team to join the organization.' });
    } catch (copyError) {
      toast({ title: 'Copy failed', description: 'Please copy the invite link manually.', variant: 'destructive' });
    }
  };

  const handleGenerateInvite = async () => {
    if (!organizationId || !entity) { setError('You need an organization on your profile to create invites.'); return; }
    setIsGenerating(true);
    setError(null);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: inviteError } = await (supabase.from('organization_invites' as any).insert({ organization_id: organizationId, token, created_by: entity.id, expires_at: expiresAt }) as any);
    if (inviteError) { setError('Could not create invite link. Please try again.'); setIsGenerating(false); return; }
    const url = `${window.location.origin}/invite/${token}`;
    setInviteUrl(url);
    setInviteExpiry(expiresAt);
    await handleCopy(url);
    setIsGenerating(false);
  };

  const handleSaveEpic = async () => {
    if (!entity || !isOrganizationOwner) { setEpicError('Only the organization owner can attach Epic API details.'); return; }
    if (!epicApiUrl.trim() || !epicOrganizationId.trim()) { setEpicError('Please provide both the Epic API link and Epic organization ID.'); return; }
    setIsSavingEpic(true);
    setEpicError(null);
    setEpicSaved(false);
    const updatedMetadata = { ...epicMetadata, epic_api_url: epicApiUrl.trim(), epic_organization_id: epicOrganizationId.trim() };
    const { error: updateError } = await supabase.from('entities').update({ metadata: updatedMetadata }).eq('id', entity.id);
    if (updateError) { setEpicError('Could not save Epic details. Please try again.'); setIsSavingEpic(false); return; }
    setIsSavingEpic(false);
    setEpicSaved(true);
    toast({ title: 'Epic API attached', description: 'Epic API details have been saved to your organization.' });
    setTimeout(() => setEpicSaved(false), 3000);
  };

  const handleSaveEhrCredentials = async (ehrType: string) => {
    if (!organizationId || !isOrganizationOwner) return;
    const creds = ehrCreds[ehrType];
    if (!creds.client_id.trim() || !creds.client_secret.trim()) {
      toast({ title: 'Missing fields', description: 'Please provide both Client ID and Client Secret.', variant: 'destructive' });
      return;
    }
    setEhrSaving(ehrType);
    setEhrSaved(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ehr-credentials?organization_id=${organizationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ehr_type: ehrType, client_id: creds.client_id.trim(), client_secret: creds.client_secret.trim() }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEhrConfigured(prev => ({ ...prev, [ehrType]: true }));
        setEhrSaved(ehrType);
        setEhrCreds(prev => ({ ...prev, [ehrType]: { client_id: '', client_secret: '' } }));
        toast({ title: 'Credentials saved', description: `${ehrType === 'epic' ? 'Epic' : 'PointClickCare'} OAuth credentials have been saved securely.` });
        setTimeout(() => setEhrSaved(null), 3000);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save credentials', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save credentials', variant: 'destructive' });
    }
    setEhrSaving(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Organization Management</h1>
          <p className="text-muted-foreground">
            Manage your organization and invite teammates to start earning CareCoin rewards together.
          </p>
        </div>

        {/* Organization summary card */}
        {isConnected && entity && organizationId && (
          <Card variant="glass" className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{organizationLabel}</h3>
                  <p className="text-xs text-muted-foreground">
                    {isOrganizationOwner ? 'Owner' : 'Member'} • Created {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isConnected && entity?.entity_type === 'organization' && (
          <Alert className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <AlertTitle>Next step: invite your team</AlertTitle>
            <AlertDescription>Send an invite link to providers and staff so they can join your organization.</AlertDescription>
          </Alert>
        )}

        {isConnected && entity && !organizationId && !isOrganizationOwner && (
          <Alert>
            <AlertTitle>Join an organization</AlertTitle>
            <AlertDescription>Organizations are owned by the first account that creates them. Ask the owner for an invite link to join.</AlertDescription>
          </Alert>
        )}

        {!isConnected && (
          <Card className="animate-fade-in-up">
            <CardHeader><CardTitle>Connect your wallet</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Connect your wallet to manage organization settings and create invite links.</p>
              <ConnectWalletButton />
            </CardContent>
          </Card>
        )}

        {isConnected && !entityLoading && !entity && (
          <Alert>
            <AlertTitle>Wallet not registered</AlertTitle>
            <AlertDescription>Register your wallet to create an organization and send invites.</AlertDescription>
          </Alert>
        )}

        {isConnected && entity && (
          <Card className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <CardHeader><CardTitle>Invite your team</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {entity.entity_type === 'organization'
                  ? `${organizationLabel} is ready. Share an invite link to add providers and staff.`
                  : 'Invite links can only be created by the organization owner.'}
              </p>
              {error && (<Alert variant="destructive"><AlertTitle>Invite error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>)}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button onClick={handleGenerateInvite} loading={isGenerating} disabled={!canGenerateInvite} variant="gradient">
                  <Link2 className="mr-2 h-4 w-4" />
                  Generate invite link
                </Button>
                {inviteExpiry && <span className="text-xs text-muted-foreground">Expires on {new Date(inviteExpiry).toLocaleDateString()}.</span>}
              </div>
              {inviteUrl && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-link">Shareable invite link</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input id="invite-link" readOnly value={inviteUrl} className="flex-1 shimmer-border" />
                    <Button variant="outline" onClick={() => handleCopy(inviteUrl)}><Copy className="mr-2 h-4 w-4" />Copy link</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isConnected && entity && (
          <Card className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <CardHeader><CardTitle>Epic API connection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The owner can attach the Epic API link and Epic organization ID so integrations run under the correct account.
              </p>
              {epicError && (<Alert variant="destructive"><AlertTitle>Epic setup error</AlertTitle><AlertDescription>{epicError}</AlertDescription></Alert>)}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="epic-api-url">Epic API link</label>
                  <Input id="epic-api-url" placeholder="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4" value={epicUrlValue} onChange={(event) => setEpicApiUrl(event.target.value)} disabled={!isOrganizationOwner} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="epic-org-id">Epic organization ID</label>
                  <Input id="epic-org-id" placeholder="Epic organization ID" value={epicIdValue} onChange={(event) => setEpicOrganizationId(event.target.value)} disabled={!isOrganizationOwner} />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {!isOrganizationOwner && <span className="text-xs text-muted-foreground">Only the organization owner can update Epic API details.</span>}
                <div className="flex items-center gap-2 sm:ml-auto">
                  {epicSaved && (
                    <span className="flex items-center gap-1 text-xs text-[hsl(var(--care-green))] animate-fade-in-up">
                      <CheckCircle2 className="h-4 w-4" /> Saved
                    </span>
                  )}
                  <Button onClick={handleSaveEpic} loading={isSavingEpic} disabled={!isOrganizationOwner}>
                    Save Epic details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EHR OAuth Credentials */}
        {isConnected && entity && isOrganizationOwner && (
          <Card className="animate-fade-in-up" style={{ animationDelay: '320ms' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>EHR OAuth Credentials</CardTitle>
                  <CardDescription>Enter your OAuth Client ID and Secret so providers can connect their EHR systems.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['epic', 'pointclickcare'] as const).map((ehrType) => {
                const label = ehrType === 'epic' ? 'Epic' : 'PointClickCare';
                const creds = ehrCreds[ehrType];
                const configured = ehrConfigured[ehrType];
                return (
                  <div key={ehrType} className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{label}</h4>
                      {configured && (
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--care-green))]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                        </span>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Client ID</label>
                        <Input
                          placeholder={configured ? '••••••••' : `${label} Client ID`}
                          value={creds.client_id}
                          onChange={(e) => setEhrCreds(prev => ({ ...prev, [ehrType]: { ...prev[ehrType], client_id: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Client Secret</label>
                        <div className="relative">
                          <Input
                            type={showSecret[ehrType] ? 'text' : 'password'}
                            placeholder={configured ? '••••••••' : `${label} Client Secret`}
                            value={creds.client_secret}
                            onChange={(e) => setEhrCreds(prev => ({ ...prev, [ehrType]: { ...prev[ehrType], client_secret: e.target.value } }))}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowSecret(prev => ({ ...prev, [ehrType]: !prev[ehrType] }))}
                          >
                            {showSecret[ehrType] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      {ehrSaved === ehrType && (
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--care-green))] animate-fade-in-up">
                          <CheckCircle2 className="h-4 w-4" /> Saved
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSaveEhrCredentials(ehrType)}
                        loading={ehrSaving === ehrType}
                        disabled={!creds.client_id.trim() || !creds.client_secret.trim()}
                      >
                        {configured ? `Update ${label}` : `Save ${label}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
