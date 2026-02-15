import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle2, AlertTriangle, Loader2, Coins } from 'lucide-react';
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

  const setError = (message: string) => { setStatus('error'); setStatusMessage(message); };
  const setSuccess = (message: string) => { setStatus('success'); setStatusMessage(message); };

  const handleAcceptInvite = async () => {
    if (!token) { setError('Invite token is missing. Please check your invite link.'); return; }
    if (!entity) { setError('You must be registered in CareCoin before accepting an invite.'); return; }
    if (entity.organization_id) { setError('Your account is already linked to an organization.'); return; }
    if (entity.entity_type === 'organization') { setError('Organization accounts cannot accept invites.'); return; }

    setSubmitting(true);
    setStatus('idle');

    const { data: invite, error: inviteError } = await (supabase
      .from('organization_invites' as any)
      .select('id, token, organization_id, expires_at, used_at, used_by')
      .eq('token', token)
      .maybeSingle() as any) as { data: { id: string; token: string; organization_id: string; expires_at: string; used_at: string | null; used_by: string | null } | null; error: any };

    if (inviteError) { setError('Unable to validate this invite. Please try again.'); setSubmitting(false); return; }
    if (!invite) { setError('Invite not found. Please request a new invite link.'); setSubmitting(false); return; }
    if (new Date(invite.expires_at) < new Date()) { setError('This invite has expired. Ask an organization admin to generate a new link.'); setSubmitting(false); return; }
    if (invite.used_at) { setError('This invite has already been used. Ask for a new invite link.'); setSubmitting(false); return; }

    const nowIso = new Date().toISOString();
    const { data: updatedInvite, error: updateInviteError } = await (supabase
      .from('organization_invites' as any)
      .update({ used_at: nowIso, used_by: entity.id })
      .eq('id', invite.id)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .select('id')
      .maybeSingle() as any);

    if (updateInviteError || !updatedInvite) { setError('This invite is no longer available. Please request a new invite link.'); setSubmitting(false); return; }

    const { error: updateEntityError } = await supabase.from('entities').update({ organization_id: invite.organization_id }).eq('id', entity.id);
    if (updateEntityError) {
      await (supabase.from('organization_invites' as any).update({ used_at: null, used_by: null }).eq('id', invite.id) as any);
      setError('Unable to join the organization. Please try again.');
      setSubmitting(false);
      return;
    }

    await refreshEntity();
    setSuccess('Invite accepted! Your account is now linked to the organization.');
    toast({ title: 'Organization linked', description: 'You can now access organization-specific rewards and dashboards.' });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background orbs matching NotFound page */}
      <div className="pointer-events-none absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-teal)/0.1)_0%,transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-green)/0.08)_0%,transparent_70%)] blur-3xl" />

      <div className="w-full max-w-xl relative z-10 animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--care-teal))] to-[hsl(var(--care-green))] shadow-[var(--shadow-glow-teal)] mb-3">
            <Coins className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gradient">CareCoin</h2>
        </div>

        <Card className="shimmer-border shadow-[var(--shadow-elevated)]">
          <CardHeader>
            <CardTitle>Accept organization invite</CardTitle>
            <CardDescription>Join an organization to access shared rewards, policies, and reporting.</CardDescription>
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
              <div className="rounded-lg border border-[hsl(var(--care-green)/0.4)] bg-[hsl(var(--care-green)/0.1)] p-4 text-sm text-[hsl(var(--care-green))] flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span>{statusMessage}</span>
              </div>
            )}

            {status === 'error' && (
              <div className="rounded-lg border border-[hsl(var(--care-warning)/0.4)] bg-[hsl(var(--care-warning)/0.1)] p-4 text-sm text-[hsl(var(--care-warning))] flex items-start gap-3">
                <AlertTriangle className="h-5 w-5" />
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              {!isConnected && !isConnecting && <p>Connect your wallet to claim the invite.</p>}
              {isConnecting && <p>Connecting wallet...</p>}
              {isConnected && entityLoading && <p>Loading your profile...</p>}
            </div>

            {!isConnected && !isConnecting && (
              <div className="w-full"><ConnectWalletButton /></div>
            )}

            <Button onClick={handleAcceptInvite} disabled={submitting || !isConnected || entityLoading || !token} variant="gradient" className="w-full">
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Accepting invite...</span>
              ) : (
                'Accept invite'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
