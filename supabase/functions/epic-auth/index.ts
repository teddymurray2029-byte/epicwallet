import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
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

    // Resolve credentials: check org-level ehr_credentials first, then env vars
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
          epicClientSecret = creds.client_secret;
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
            console.error('Failed to store state token:', insertErr);
            return new Response(
              JSON.stringify({ error: 'Failed to initiate OAuth flow' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      }

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
        console.error('Invalid state token:', state);
        return Response.redirect(`${frontendBase}/provider/epic?error=invalid_state`, 302);
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
          callbackClientSecret = callbackCreds.client_secret;
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
        const errText = await tokenRes.text();
        console.error('Token exchange failed:', errText);
        return Response.redirect(`${frontendBase}/provider/epic?error=token_exchange_failed`, 302);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

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
          console.log('FHIR Subscription registered:', subscriptionId);
        } else {
          console.warn('FHIR Subscription registration failed:', await subscriptionRes.text());
        }
      } catch (subErr) {
        console.warn('FHIR Subscription error (non-fatal):', subErr);
      }

      const { error: updateErr } = await supabase
        .from('ehr_integrations')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          subscription_id: subscriptionId,
          fhir_base_url: epicFhirBase,
          auth_state: null,
          is_active: true,
        })
        .eq('id', integration.id);

      if (updateErr) {
        console.error('Failed to store tokens:', updateErr);
        return Response.redirect(`${frontendBase}/provider/epic?error=storage_failed`, 302);
      }

      console.log('Epic OAuth flow completed for integration:', integration.id);
      return Response.redirect(`${frontendBase}/provider/epic?connected=true`, 302);
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

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Use ?action=authorize or provide code+state callback params.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('epic-auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
