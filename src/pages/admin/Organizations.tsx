import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { toast } from '@/hooks/use-toast';
import { Copy, Link2 } from 'lucide-react';

const INVITE_EXPIRY_DAYS = 7;

const generateToken = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID().split('-').join('');
  }
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

  const organizationId = entity?.entity_type === 'organization' ? entity.id : entity?.organization_id;
  const organizationLabel = entity?.display_name || 'Your organization';

  const isOrganizationOwner = entity?.entity_type === 'organization';
  const canGenerateInvite = Boolean(isConnected && organizationId && isOrganizationOwner);

  // Parse existing Epic metadata from entity
  const epicMetadata = (entity?.metadata as Record<string, unknown>) || {};
  const epicUrlValue = epicApiUrl || (epicMetadata.epic_api_url as string) || '';
  const epicIdValue = epicOrganizationId || (epicMetadata.epic_organization_id as string) || '';

  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: 'Invite link copied',
        description: 'Share this link with your team to join the organization.',
      });
    } catch (copyError) {
      console.error('Clipboard copy failed', copyError);
      toast({
        title: 'Copy failed',
        description: 'Please copy the invite link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateInvite = async () => {
    if (!organizationId || !entity) {
      setError('You need an organization on your profile to create invites.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        token,
        created_by: entity.id,
        expires_at: expiresAt,
      });

    if (inviteError) {
      console.error('Invite creation failed', inviteError);
      setError('Could not create invite link. Please try again.');
      setIsGenerating(false);
      return;
    }

    const url = `${window.location.origin}/invite/${token}`;
    setInviteUrl(url);
    setInviteExpiry(expiresAt);

    await handleCopy(url);

    setIsGenerating(false);
  };

  const handleSaveEpic = async () => {
    if (!entity || !isOrganizationOwner) {
      setEpicError('Only the organization owner can attach Epic API details.');
      return;
    }

    if (!epicApiUrl.trim() || !epicOrganizationId.trim()) {
      setEpicError('Please provide both the Epic API link and Epic organization ID.');
      return;
    }

    setIsSavingEpic(true);
    setEpicError(null);

    const updatedMetadata = {
      ...epicMetadata,
      epic_api_url: epicApiUrl.trim(),
      epic_organization_id: epicOrganizationId.trim(),
    };

    const { error: updateError } = await supabase
      .from('entities')
      .update({ metadata: updatedMetadata })
      .eq('id', entity.id);

    if (updateError) {
      console.error('Epic API update failed', updateError);
      setEpicError('Could not save Epic details. Please try again.');
      setIsSavingEpic(false);
      return;
    }

    setIsSavingEpic(false);
    toast({
      title: 'Epic API attached',
      description: 'Epic API details have been saved to your organization.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-muted-foreground">
            Manage your organization and invite teammates to start earning CareCoin rewards together.
          </p>
        </div>

        {isConnected && entity?.entity_type === 'organization' && (
          <Alert>
            <AlertTitle>Next step: invite your team</AlertTitle>
            <AlertDescription>
              Send an invite link to providers and staff so they can join your organization.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && entity && !organizationId && !isOrganizationOwner && (
          <Alert>
            <AlertTitle>Join an organization</AlertTitle>
            <AlertDescription>
              Organizations are owned by the first account that creates them. Ask the owner for an invite link to join.
            </AlertDescription>
          </Alert>
        )}

        {!isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your wallet to manage organization settings and create invite links.
              </p>
              <ConnectWalletButton />
            </CardContent>
          </Card>
        )}

        {isConnected && !entityLoading && !entity && (
          <Alert>
            <AlertTitle>Wallet not registered</AlertTitle>
            <AlertDescription>
              Register your wallet to create an organization and send invites.
            </AlertDescription>
          </Alert>
        )}

        {isConnected && entity && (
          <Card>
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {entity.entity_type === 'organization'
                  ? `${organizationLabel} is ready. Share an invite link to add providers and staff.`
                  : 'Invite links can only be created by the organization owner.'}
              </p>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Invite error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Button onClick={handleGenerateInvite} disabled={isGenerating || !canGenerateInvite}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating invite...' : 'Generate invite link'}
                </Button>
                {inviteExpiry && (
                  <span className="text-xs text-muted-foreground">
                    Expires on {new Date(inviteExpiry).toLocaleDateString()}.
                  </span>
                )}
              </div>

              {inviteUrl && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="invite-link">
                    Shareable invite link
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input id="invite-link" readOnly value={inviteUrl} className="flex-1" />
                    <Button variant="outline" onClick={() => handleCopy(inviteUrl)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isConnected && entity && (
          <Card>
            <CardHeader>
              <CardTitle>Epic API connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Organizations are owned by the first account that creates them. The owner can attach the Epic API
                link and Epic organization ID so integrations run under the correct account.
              </p>

              {epicError && (
                <Alert variant="destructive">
                  <AlertTitle>Epic setup error</AlertTitle>
                  <AlertDescription>{epicError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="epic-api-url">
                    Epic API link
                  </label>
                  <Input
                    id="epic-api-url"
                    placeholder="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
                    value={epicUrlValue}
                    onChange={(event) => setEpicApiUrl(event.target.value)}
                    disabled={!isOrganizationOwner}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="epic-org-id">
                    Epic organization ID
                  </label>
                  <Input
                    id="epic-org-id"
                    placeholder="Epic organization ID"
                    value={epicIdValue}
                    onChange={(event) => setEpicOrganizationId(event.target.value)}
                    disabled={!isOrganizationOwner}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {!isOrganizationOwner && (
                  <span className="text-xs text-muted-foreground">
                    Only the organization owner can update Epic API details.
                  </span>
                )}
                <Button
                  onClick={handleSaveEpic}
                  disabled={!isOrganizationOwner || isSavingEpic}
                  className="sm:ml-auto"
                >
                  {isSavingEpic ? 'Saving Epic details...' : 'Save Epic details'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
