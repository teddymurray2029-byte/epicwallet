import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Copy, Link2, RefreshCw, XCircle, Shield, CheckCircle2, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';

interface OrganizationInvite {
  id: string;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  organization_id: string;
  used_by: string | null;
  created_by: string | null;
}

const DEFAULT_EXPIRY_DAYS = 7;

export default function OrganizationInvites() {
  const { isConnected, isConnecting, entity, entityLoading, isOrganization } = useWallet();
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [expiryDays, setExpiryDays] = useState(String(DEFAULT_EXPIRY_DAYS));
  const [latestInviteLink, setLatestInviteLink] = useState<string | null>(null);

  // EHR Credentials state
  const [ehrCreds, setEhrCreds] = useState<Record<string, { client_id: string; client_secret: string }>>({
    epic: { client_id: '', client_secret: '' },
    pointclickcare: { client_id: '', client_secret: '' },
  });
  const [ehrConfigured, setEhrConfigured] = useState<Record<string, boolean>>({ epic: false, pointclickcare: false });
  const [ehrSaving, setEhrSaving] = useState<string | null>(null);
  const [ehrSaved, setEhrSaved] = useState<string | null>(null);
  const [ehrDeleting, setEhrDeleting] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({ epic: false, pointclickcare: false });

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const inviteSummary = useMemo(() => {
    return invites.map((invite) => {
      const expired = isExpired(invite.expires_at);
      const used = Boolean(invite.used_at);
      const status = used ? 'Used' : expired ? 'Expired' : 'Active';
      return { ...invite, status };
    });
  }, [invites]);

  const counts = useMemo(() => {
    const c = { Active: 0, Used: 0, Expired: 0 };
    inviteSummary.forEach((i) => { c[i.status as keyof typeof c]++; });
    return c;
  }, [inviteSummary]);

  const orgId = entity?.organization_id ?? entity?.id;

  const fetchInvites = async () => {
    if (!entity || !orgId) return;
    setLoadingInvites(true);
    const { data, error } = await (supabase.from('organization_invites' as any).select('*').eq('organization_id', orgId).order('created_at', { ascending: false }) as any);
    if (error) {
      console.error('Error loading invites:', error);
      toast({ title: 'Failed to load invites', description: error.message, variant: 'destructive' });
      setLoadingInvites(false);
      return;
    }
    setInvites((data as OrganizationInvite[]) ?? []);
    setLoadingInvites(false);
  };

  // Fetch EHR credential status
  const fetchEhrStatus = async () => {
    if (!entity?.id) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ehr-credentials?organization_id=${orgId}&wallet_address=${entity.wallet_address}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const data = await res.json();
      if (data.configured) {
        setEhrConfigured(data.configured);
      }
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    if (entity && isOrganization) {
      fetchInvites();
      fetchEhrStatus();
    }
  }, [entity, isOrganization]);

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: 'Invite link copied', description: 'Share this link with the team member you want to onboard.' });
    } catch (error) {
      console.error('Error copying invite link:', error);
      toast({ title: 'Copy failed', description: 'Please copy the invite link manually.', variant: 'destructive' });
    }
  };

  const handleCreateInvite = async () => {
    if (!entity) return;
    const parsedDays = Number(expiryDays);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      toast({ title: 'Invalid expiration window', description: 'Enter a valid number of days for the invite to remain active.', variant: 'destructive' });
      return;
    }
    setCreatingInvite(true);
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase.from('organization_invites' as any).insert({ organization_id: orgId, token, created_by: entity.id, expires_at: expiresAt }) as any);
    if (error) {
      console.error('Error creating invite:', error);
      toast({ title: 'Invite creation failed', description: error.message, variant: 'destructive' });
      setCreatingInvite(false);
      return;
    }
    const inviteLink = `${window.location.origin}/invites/accept?token=${token}`;
    setLatestInviteLink(inviteLink);
    toast({ title: 'Invite created', description: 'Your invite link is ready to share.' });
    await fetchInvites();
    setCreatingInvite(false);
  };

  const handleRevoke = async (inviteId: string) => {
    const { error } = await (supabase.from('organization_invites' as any).update({ expires_at: new Date().toISOString() }).eq('id', inviteId) as any);
    if (error) {
      toast({ title: 'Revoke failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Invite revoked' });
    await fetchInvites();
  };

  const handleSaveEhrCredentials = async (ehrType: string) => {
    if (!entity?.id) return;
    const creds = ehrCreds[ehrType];
    if (!creds.client_id.trim() || !creds.client_secret.trim()) {
      toast({ title: 'Missing fields', description: 'Please provide both Client ID and Client Secret.', variant: 'destructive' });
      return;
    }
    setEhrSaving(ehrType);
    setEhrSaved(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ehr-credentials?organization_id=${orgId}&wallet_address=${entity.wallet_address}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
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

  const handleDeleteEhrCredentials = async (ehrType: string) => {
    if (!entity?.id) return;
    setEhrDeleting(ehrType);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ehr-credentials?organization_id=${orgId}&wallet_address=${entity.wallet_address}&ehr_type=${ehrType}`,
        { method: 'DELETE', headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const data = await res.json();
      if (data.success) {
        setEhrConfigured(prev => ({ ...prev, [ehrType]: false }));
        toast({ title: 'Credentials removed', description: `${ehrType === 'epic' ? 'Epic' : 'PointClickCare'} credentials have been removed.` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to remove credentials', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove credentials', variant: 'destructive' });
    }
    setEhrDeleting(null);
  };

  if (isConnecting) {
    return (<DashboardLayout><div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Connecting wallet...</div></div></DashboardLayout>);
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full animate-fade-in-up">
            <CardHeader>
              <CardTitle>Connect your wallet</CardTitle>
              <CardDescription>Organization invite management is available once your wallet is connected.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (entityLoading) {
    return (<DashboardLayout><div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="animate-pulse text-muted-foreground">Loading organization data...</div></div></DashboardLayout>);
  }

  if (!entityLoading && (!entity || !isOrganization)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full animate-fade-in-up">
            <CardHeader>
              <CardTitle>Organization access required</CardTitle>
              <CardDescription>Invite management is only available for organization admin wallets.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-[hsl(var(--care-green))] text-primary-foreground gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80 inline-block" />{status}</Badge>;
      case 'Used': return <Badge variant="secondary">{status}</Badge>;
      case 'Expired': return <Badge variant="outline" className="text-muted-foreground">{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Organization Management</h1>
          <p className="text-muted-foreground">
            Manage invites and EHR credentials for your organization.
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-3 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <Badge variant="outline" className="text-sm px-3 py-1 border-[hsl(var(--care-green)/0.4)] text-[hsl(var(--care-green))]">{counts.Active} Active</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">{counts.Used} Used</Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">{counts.Expired} Expired</Badge>
        </div>

        <Card className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Create an invite</CardTitle>
            <CardDescription>Set an expiration window and share the link with your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expires in (days)</Label>
                <Input id="expiryDays" type="number" min={1} value={expiryDays} onChange={(event) => setExpiryDays(event.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCreateInvite} loading={creatingInvite} variant="gradient" className="w-full md:w-auto">
                  <Link2 className="mr-2 h-4 w-4" />
                  Generate invite link
                </Button>
                <Button variant="outline" onClick={fetchInvites} loading={loadingInvites} className="w-full md:w-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {latestInviteLink && (
              <div className="rounded-lg border border-border/40 shimmer-border bg-muted/30 p-4">
                <p className="text-sm font-medium">Latest invite link</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <code className="text-xs text-muted-foreground break-all">{latestInviteLink}</code>
                  <Button variant="secondary" size="sm" onClick={() => handleCopy(latestInviteLink)}>
                    <Copy className="mr-2 h-4 w-4" />Copy
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <CardHeader>
            <CardTitle>Active and past invites</CardTitle>
            <CardDescription>Track invite usage and expiration.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading invites...</div>
            ) : inviteSummary.length === 0 ? (
              <div className="text-sm text-muted-foreground">No invites created yet.</div>
            ) : (
              <div className="space-y-3">
                {inviteSummary.map((invite, index) => {
                  const inviteLink = `${window.location.origin}/invites/accept?token=${invite.token}`;
                  return (
                    <div
                      key={invite.id}
                      className="rounded-lg border border-border/40 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-all duration-200 hover:bg-muted/30 hover:shadow-sm"
                      style={{ animation: `fade-in-up 0.3s ease-out ${index * 50}ms both` }}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(invite.status)}
                          <span className="text-xs text-muted-foreground">
                            Expires {new Date(invite.expires_at).toLocaleString()}
                          </span>
                          {invite.used_at && (
                            <span className="text-xs text-muted-foreground">
                              Used {new Date(invite.used_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground break-all">{inviteLink}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleCopy(inviteLink)}>
                          <Copy className="mr-2 h-4 w-4" />Copy link
                        </Button>
                        {invite.status === 'Active' && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRevoke(invite.id)}>
                            <XCircle className="mr-1 h-4 w-4" />Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* EHR OAuth Credentials */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
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
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-[hsl(var(--care-green))]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 px-2"
                          onClick={() => handleDeleteEhrCredentials(ehrType)}
                          loading={ehrDeleting === ehrType}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
      </div>
    </DashboardLayout>
  );
}
