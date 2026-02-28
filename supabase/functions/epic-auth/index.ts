import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://carewallet.lovable.app',
  'https://id-preview--63f64bab-d4cb-4037-bbce-9b1e2546fa52.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

function redactWallet(w: string | null | undefined): string {
  if (!w) return '[none]';
  return w.length > 10 ? `${w.slice(0, 6)}…${w.slice(-4)}` : '[short]';
}

async function getEncryptionKey(): Promise<CryptoKey | null> {
  const hexKey = Deno.env.get('ENCRYPTION_KEY');
  if (!hexKey) return null;
  try {
    const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
    if (keyBytes.length !== 32) { console.warn('ENCRYPTION_KEY is not 32 bytes, skipping encryption'); return null; }
    return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } catch (e) {
    console.warn('Failed to import ENCRYPTION_KEY:', e?.message);
    return null;
  }
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(ciphertextB64: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) return ciphertextB64;
  try {
    const combined = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch {
    return ciphertextB64;
  }
}

async function auditLog(supabase: any, action: string, resourceType: string, details: Record<string, unknown> = {}, req?: Request, wallet?: string) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      resource_type: resourceType,
      actor_wallet: wallet ? redactWallet(wallet) : null,
      ip_address: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: req?.headers.get('user-agent')?.slice(0, 200) || null,
      details,
    });
  } catch { /* non-fatal */ }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);

    const action = url.searchParams.get('action');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const entityId = url.searchParams.get('entity_id');

    // Resolve credentials
    let epicClientId = Deno.env.get('EPIC_CLIENT_ID') || '';
    let epicClientSecret = Deno.env.get('EPIC_CLIENT_SECRET') || '';

    if (entityId) {
      const { data: providerEntity } = await supabase
        .from('entities')
        .select('organization_id')
        .eq('id', entityId)
        .maybeSingle();

      const orgId = providerEntity?.organization_id || entityId;
      if (orgId) {
        const { data: creds } = await supabase
          .from('ehr_credentials')
          .select('client_id, client_secret')
          .eq('organization_id', orgId)
          .eq('ehr_type', 'epic')
          .maybeSingle();

        if (creds) {
          epicClientId = creds.client_id;
          epicClientSecret = await decrypt(creds.client_secret);
        }
      }
    }

    const credentialsConfigured = !!(epicClientId && epicClientSecret);

    if (!credentialsConfigured && action === 'authorize') {
      return new Response(
        JSON.stringify({ configured: false, message: 'Epic OAuth credentials have not been configured by your administrator yet.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!credentialsConfigured) {
      return new Response(
        JSON.stringify({ error: 'Epic OAuth credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const redirectUri = `${supabaseUrl}/functions/v1/epic-auth`;
    const epicAuthorizeUrl = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize';
    const epicTokenUrl = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
    const epicFhirBase = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

    const origin = req.headers.get('origin') || req.headers.get('referer');
    const frontendBase = origin ? new URL(origin).origin : supabaseUrl.replace('.supabase.co', '.lovable.app');

    // ─── Flow 1: Initiate OAuth ───
    if (action === 'authorize') {
      if (!entityId) {
        return new Response(
          JSON.stringify({ error: 'entity_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const stateToken = crypto.randomUUID();

      const { error: upsertError } = await supabase
        .from('ehr_integrations')
        .upsert(
          {
            entity_id: entityId,
            integration_type: 'epic',
            client_id: epicClientId,
            auth_state: stateToken,
            is_active: false,
          },
          { onConflict: 'entity_id,integration_type' },
        );

      if (upsertError) {
        const { data: existing } = await supabase
          .from('ehr_integrations')
          .select('id')
          .eq('entity_id', entityId)
          .eq('integration_type', 'epic')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('ehr_integrations')
            .update({ auth_state: stateToken, client_id: epicClientId })
            .eq('id', existing.id);
        } else {
          const { error: insertErr } = await supabase.from('ehr_integrations').insert({
            entity_id: entityId,
            integration_type: 'epic',
            client_id: epicClientId,
            auth_state: stateToken,
            is_active: false,
          });
          if (insertErr) {
            return new Response(
              JSON.stringify({ error: 'Failed to initiate OAuth flow' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      }

      await auditLog(supabase, 'epic_oauth_initiated', 'ehr_integrations', { entity_id: entityId }, req);

      const authUrl = new URL(epicAuthorizeUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', epicClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', stateToken);
      authUrl.searchParams.set('scope', 'system/*.read');

      return new Response(
        JSON.stringify({ authorize_url: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Flow 2: OAuth Callback ───
    if (code && state) {
      const { data: integration, error: findErr } = await supabase
        .from('ehr_integrations')
        .select('*')
        .eq('auth_state', state)
        .eq('integration_type', 'epic')
        .maybeSingle();

      if (findErr || !integration) {
        return Response.redirect(`${frontendBase}/provider/ehr?error=invalid_state`, 302);
      }

      // Re-resolve credentials for the callback entity
      let callbackClientId = epicClientId;
      let callbackClientSecret = epicClientSecret;
      const { data: callbackEntity } = await supabase
        .from('entities')
        .select('organization_id')
        .eq('id', integration.entity_id)
        .maybeSingle();

      const callbackOrgId = callbackEntity?.organization_id || integration.entity_id;
      if (callbackOrgId) {
        const { data: callbackCreds } = await supabase
          .from('ehr_credentials')
          .select('client_id, client_secret')
          .eq('organization_id', callbackOrgId)
          .eq('ehr_type', 'epic')
          .maybeSingle();
        if (callbackCreds) {
          callbackClientId = callbackCreds.client_id;
          callbackClientSecret = await decrypt(callbackCreds.client_secret);
        }
      }

      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: callbackClientId,
        client_secret: callbackClientSecret,
      });

      const tokenRes = await fetch(epicTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (!tokenRes.ok) {
        await auditLog(supabase, 'epic_token_exchange_failed', 'ehr_integrations', { entity_id: integration.entity_id }, req);
        return Response.redirect(`${frontendBase}/provider/ehr?error=token_exchange_failed`, 302);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Encrypt tokens before storage
      const encryptedAccessToken = await encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? await encrypt(refreshToken) : null;

      const webhookUrl = `${supabaseUrl}/functions/v1/epic-webhook`;
      let subscriptionId: string | null = null;

      try {
        const subscriptionRes = await fetch(`${epicFhirBase}/Subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            resourceType: 'Subscription',
            status: 'requested',
            reason: 'CareCoin documentation event notifications',
            criteria: 'Encounter?status=finished',
            channel: { type: 'rest-hook', endpoint: webhookUrl, payload: 'application/json' },
          }),
        });

        if (subscriptionRes.ok) {
          const subData = await subscriptionRes.json();
          subscriptionId = subData.id || null;
        }
      } catch { /* non-fatal */ }

      const { error: updateErr } = await supabase
        .from('ehr_integrations')
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          subscription_id: subscriptionId,
          fhir_base_url: epicFhirBase,
          auth_state: null,
          is_active: true,
        })
        .eq('id', integration.id);

      if (updateErr) {
        return Response.redirect(`${frontendBase}/provider/ehr?error=storage_failed`, 302);
      }

      await auditLog(supabase, 'epic_oauth_completed', 'ehr_integrations', { entity_id: integration.entity_id }, req);
      return Response.redirect(`${frontendBase}/provider/ehr?connected=epic`, 302);
    }

    // ─── Flow 3: Disconnect ───
    if (action === 'disconnect') {
      if (!entityId) {
        return new Response(
          JSON.stringify({ error: 'entity_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: delError } = await supabase
        .from('ehr_integrations')
        .delete()
        .eq('entity_id', entityId)
        .eq('integration_type', 'epic');

      if (delError) {
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await auditLog(supabase, 'epic_disconnected', 'ehr_integrations', { entity_id: entityId }, req);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('epic-auth error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
