import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';

export default function AcceptInvite() {
  const location = useLocation();
  const { isConnected, isConnecting, entity, entityLoading, refreshEntity } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('token')?.trim() ?? '';
  }, [location.search]);

  const setError = (message: string) => {
    setStatus('error');
    setStatusMessage(message);
  };

  const setSuccess = (message: string) => {
    setStatus('success');
    setStatusMessage(message);
  };

  const handleAcceptInvite = async () => {
    if (!token) {
      setError('Invite token is missing. Please check your invite link.');
      return;
    }

    if (!entity) {
      setError('You must be registered in CareCoin before accepting an invite.');
      return;
    }

    if (entity.organization_id) {
      setError('Your account is already linked to an organization.');
      return;
    }

    if (entity.entity_type === 'organization') {
      setError('Organization accounts cannot accept invites.');
      return;
    }

    setSubmitting(true);
    setStatus('idle');

    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('id, token, organization_id, expires_at, used_at, used_by')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) {
      console.error('Error loading invite:', inviteError);
      setError('Unable to validate this invite. Please try again.');
      setSubmitting(false);
      return;
    }

    if (!invite) {
      setError('Invite not found. Please request a new invite link.');
      setSubmitting(false);
      return;
    }

    const expired = new Date(invite.expires_at) < new Date();
    if (expired) {
      setError('This invite has expired. Ask an organization admin to generate a new link.');
      setSubmitting(false);
      return;
    }

    if (invite.used_at) {
      setError('This invite has already been used. Ask for a new invite link.');
      setSubmitting(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const { data: updatedInvite, error: updateInviteError } = await supabase
      .from('organization_invites')
      .update({ used_at: nowIso, used_by: entity.id })
      .eq('id', invite.id)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('id')
      .maybeSingle();

    if (updateInviteError || !updatedInvite) {
      console.error('Error updating invite:', updateInviteError);
      setError('This invite is no longer available. Please request a new invite link.');
      setSubmitting(false);
      return;
    }

    const { error: updateEntityError } = await supabase
      .from('entities')
      .update({ organization_id: invite.organization_id })
      .eq('id', entity.id);

    if (updateEntityError) {
      console.error('Error updating entity:', updateEntityError);
      await supabase
        .from('organization_invites')
        .update({ used_at: null, used_by: null })
        .eq('id', invite.id);
      setError('Unable to join the organization. Please try again.');
      setSubmitting(false);
      return;
    }

    await refreshEntity();
    setSuccess('Invite accepted! Your account is now linked to the organization.');
    toast({
      title: 'Organization linked',
      description: 'You can now access organization-specific rewards and dashboards.',
    });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Accept organization invite</CardTitle>
          <CardDescription>
            Join an organization to access shared rewards, policies, and reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {token ? (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">Token</Badge>
              <span className="truncate text-muted-foreground">{token}</span>
            </div>
          ) : (
            <Badge variant="destructive">Missing token</Badge>
          )}

          {status === 'success' && (
            <div className="rounded-lg border border-care-green/40 bg-care-green/10 p-4 text-sm text-care-green flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg border border-care-warning/40 bg-care-warning/10 p-4 text-sm text-care-warning flex items-start gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            {!isConnected && !isConnecting && (
              <p>Connect your wallet to claim the invite.</p>
            )}
            {isConnecting && <p>Connecting wallet...</p>}
            {isConnected && entityLoading && <p>Loading your profile...</p>}
          </div>

          {!isConnected && !isConnecting && (
            <div className="w-full">
              <ConnectWalletButton />
            </div>
          )}

          <Button
            onClick={handleAcceptInvite}
            disabled={submitting || !isConnected || entityLoading || !token}
            className="w-full"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Accepting invite...
              </span>
            ) : (
              'Accept invite'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
