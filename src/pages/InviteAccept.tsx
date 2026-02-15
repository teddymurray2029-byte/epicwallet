import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

interface InviteRecord {
  id: string;
  organization_id: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
}

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const { isConnected, isConnecting, entity, entityLoading, refreshEntity } = useWallet();
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = useMemo(() => {
    if (!invite?.expires_at) return false;
    return new Date(invite.expires_at).getTime() < Date.now();
  }, [invite]);

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) { setError('Invite token is missing.'); setLoading(false); return; }
      setLoading(true);
      const { data, error: fetchError } = await (supabase
        .from('organization_invites' as any)
        .select('id, organization_id, expires_at, used_at, used_by')
        .eq('token', token)
        .maybeSingle() as any);

      if (fetchError) { setError('Unable to load this invite. Please try again later.'); setLoading(false); return; }
      if (!data) { setError('This invite link is invalid or has already been removed.'); setLoading(false); return; }

      setInvite(data);

      // Fetch org name
      const { data: orgData } = await supabase.from('entities').select('display_name').eq('id', data.organization_id).maybeSingle();
      if (orgData?.display_name) setOrgName(orgData.display_name);

      setLoading(false);
    };
    loadInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!invite) return;
    if (!entity) { setError('Your wallet needs to be registered before accepting this invite.'); return; }
    if (invite.used_at) { setError('This invite link has already been used.'); return; }
    if (isExpired) { setError('This invite link has expired.'); return; }
    if (entity.organization_id === invite.organization_id) {
      toast({ title: 'Already joined', description: 'Your wallet is already linked to this organization.' });
      return;
    }

    setIsAccepting(true);
    setError(null);
    const now = new Date().toISOString();

    const { error: entityError } = await supabase.from('entities').update({ organization_id: invite.organization_id }).eq('id', entity.id);
    if (entityError) { setError('We could not add you to the organization. Please try again.'); setIsAccepting(false); return; }

    const { error: inviteError } = await (supabase.from('organization_invites' as any).update({ used_at: now, used_by: entity.id }).eq('id', invite.id).is('used_at', null) as any);
    if (inviteError) { setError('Invite accepted, but we could not finalize the invite status.'); setIsAccepting(false); return; }

    await refreshEntity();
    toast({ title: 'Invite accepted', description: 'Your wallet is now linked to the organization.' });
    setIsAccepting(false);
  };

  const displayOrgName = orgName || (invite?.organization_id ? `Org ${invite.organization_id.slice(0, 8)}…` : 'an organization');

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-lg animate-fade-in-up shimmer-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Join organization</CardTitle>
                <CardDescription>Accept the invite to join <strong>{displayOrgName}</strong></CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Loading invite details...</p>}

            {!loading && error && (
              <Alert variant="destructive">
                <AlertTitle>Invite error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!loading && invite && !error && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You're about to join <span className="font-medium text-foreground">{displayOrgName}</span>.
                </p>
                {invite.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    This invite expires on {new Date(invite.expires_at).toLocaleString()}.
                  </p>
                )}
                {invite.used_at && (
                  <Alert><AlertTitle>Invite already used</AlertTitle><AlertDescription>This invite link has already been used.</AlertDescription></Alert>
                )}
                {isExpired && (
                  <Alert><AlertTitle>Invite expired</AlertTitle><AlertDescription>This invite link has expired.</AlertDescription></Alert>
                )}
              </div>
            )}

            {isConnecting && <p className="text-sm text-muted-foreground">Connecting wallet...</p>}

            {!isConnected && !isConnecting && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Connect your wallet to accept this invite.</p>
                <ConnectWalletButton />
              </div>
            )}

            {isConnected && entityLoading && <p className="text-sm text-muted-foreground">Loading your wallet profile...</p>}

            {isConnected && !entityLoading && !entity && (
              <Alert>
                <AlertTitle>Wallet not registered</AlertTitle>
                <AlertDescription>Register your wallet first, then return to this invite link to join the organization.</AlertDescription>
              </Alert>
            )}

            {isConnected && entity && invite && !error && !isExpired && !invite.used_at && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button onClick={handleAcceptInvite} loading={isAccepting} variant="gradient">
                  Accept invite
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/admin/organizations">Go to organization settings</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
