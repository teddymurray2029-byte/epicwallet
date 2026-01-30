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
import { Copy, Link2, RefreshCw } from 'lucide-react';

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

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  const inviteSummary = useMemo(() => {
    return invites.map((invite) => {
      const expired = isExpired(invite.expires_at);
      const used = Boolean(invite.used_at);
      const status = used ? 'Used' : expired ? 'Expired' : 'Active';
      return { ...invite, status };
    });
  }, [invites]);

  const fetchInvites = async () => {
    if (!entity) return;
    setLoadingInvites(true);
    const { data, error } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', entity.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invites:', error);
      toast({
        title: 'Failed to load invites',
        description: error.message,
        variant: 'destructive',
      });
      setLoadingInvites(false);
      return;
    }

    setInvites((data as OrganizationInvite[]) ?? []);
    setLoadingInvites(false);
  };

  useEffect(() => {
    if (entity && isOrganization) {
      fetchInvites();
    }
  }, [entity, isOrganization]);

  const handleCopy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Invite link copied',
        description: 'Share this link with the team member you want to onboard.',
      });
    } catch (error) {
      console.error('Error copying invite link:', error);
      toast({
        title: 'Copy failed',
        description: 'Please copy the invite link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateInvite = async () => {
    if (!entity) return;

    const parsedDays = Number(expiryDays);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      toast({
        title: 'Invalid expiration window',
        description: 'Enter a valid number of days for the invite to remain active.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingInvite(true);
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('organization_invites').insert({
      organization_id: entity.id,
      token,
      created_by: entity.id,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Error creating invite:', error);
      toast({
        title: 'Invite creation failed',
        description: error.message,
        variant: 'destructive',
      });
      setCreatingInvite(false);
      return;
    }

    const inviteLink = `${window.location.origin}/invites/accept?token=${token}`;
    setLatestInviteLink(inviteLink);
    toast({
      title: 'Invite created',
      description: 'Your invite link is ready to share.',
    });
    await fetchInvites();
    setCreatingInvite(false);
  };

  if (isConnecting) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Connecting wallet...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Connect your wallet</CardTitle>
              <CardDescription>
                Organization invite management is available once your wallet is connected.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (entityLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading organization data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!entityLoading && (!entity || !isOrganization)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Organization access required</CardTitle>
              <CardDescription>
                Invite management is only available for organization admin wallets.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Invites</h1>
          <p className="text-muted-foreground">
            Generate secure links to onboard new providers, patients, and admins into your organization.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create an invite</CardTitle>
            <CardDescription>Set an expiration window and share the link with your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[160px_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="expiryDays">Expires in (days)</Label>
                <Input
                  id="expiryDays"
                  type="number"
                  min={1}
                  value={expiryDays}
                  onChange={(event) => setExpiryDays(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleCreateInvite} disabled={creatingInvite} className="w-full md:w-auto">
                  <Link2 className="mr-2 h-4 w-4" />
                  {creatingInvite ? 'Creating...' : 'Generate invite link'}
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchInvites}
                  disabled={loadingInvites}
                  className="w-full md:w-auto"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {latestInviteLink && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium">Latest invite link</p>
                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <code className="text-xs text-muted-foreground break-all">{latestInviteLink}</code>
                  <Button variant="secondary" size="sm" onClick={() => handleCopy(latestInviteLink)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active and past invites</CardTitle>
            <CardDescription>Track invite usage and expiration.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <div className="text-sm text-muted-foreground">Loading invites...</div>
            ) : inviteSummary.length === 0 ? (
              <div className="text-sm text-muted-foreground">No invites created yet.</div>
            ) : (
              <div className="space-y-3">
                {inviteSummary.map((invite) => {
                  const inviteLink = `${window.location.origin}/invites/accept?token=${invite.token}`;
                  return (
                    <div
                      key={invite.id}
                      className="rounded-lg border border-border/60 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={invite.status === 'Active' ? 'default' : 'secondary'}>{invite.status}</Badge>
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
                          <Copy className="mr-2 h-4 w-4" />
                          Copy link
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
