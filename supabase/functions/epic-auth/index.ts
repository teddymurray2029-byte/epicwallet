import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': origin,
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

// ─── JWT Assertion helpers for Epic Backend System apps ───

function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function textToBase64url(text: string): string {
  return base64urlEncode(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function createJwtAssertion(clientId: string, tokenUrl: string, privateKeyPem: string, kid?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const header: Record<string, string> = { alg: 'RS384', typ: 'JWT' };
  if (kid) header.kid = kid;
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: tokenUrl,
    jti,
    exp: now + 300, // 5 minutes
    iat: now,
    nbf: now,
  };

  const headerB64 = textToBase64url(JSON.stringify(header));
  const payloadB64 = textToBase64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

// Detect whether the secret is a PEM private key or a simple secret string
function isPrivateKeyPem(secret: string): boolean {
  return secret.includes('-----BEGIN') && secret.includes('PRIVATE KEY');
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
    const entityId = url.searchParams.get('entity_id');

    // Resolve credentials
    let epicClientId = Deno.env.get('EPIC_CLIENT_ID') || '';
    let epicClientSecret = Deno.env.get('EPIC_CLIENT_SECRET') || '';

    let epicKid: string | undefined;

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
          .select('client_id, client_secret, public_key_jwks')
          .eq('organization_id', orgId)
          .eq('ehr_type', 'epic')
          .maybeSingle();

        if (creds) {
          epicClientId = creds.client_id;
          const rawSecret = creds.client_secret;
          epicClientSecret = await decrypt(rawSecret);
          // Extract kid from stored JWKS so the JWT header matches
          if (creds.public_key_jwks?.keys?.[0]?.kid) {
            epicKid = creds.public_key_jwks.keys[0].kid;
          }
          console.log(`Epic creds loaded from DB for org ${orgId}. client_id=${epicClientId.slice(0,8)}…, kid=${epicKid || '[none]'}, secret starts with: ${epicClientSecret.slice(0,27)}`);
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

    const epicTokenUrl = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
    const epicFhirBase = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

    // ─── Flow 1: Connect via Client Credentials ───
    if (action === 'authorize') {
      if (!entityId) {
        return new Response(
          JSON.stringify({ error: 'entity_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await auditLog(supabase, 'epic_client_credentials_initiated', 'ehr_integrations', { entity_id: entityId }, req);

      let tokenBody: URLSearchParams;

      if (isPrivateKeyPem(epicClientSecret)) {
        // JWT assertion flow for Backend System apps
        console.log('Using JWT assertion flow for Epic Backend System');
        console.log(`JWT params: iss/sub=${epicClientId}, aud=${epicTokenUrl}`);
        try {
          const jwt = await createJwtAssertion(epicClientId, epicTokenUrl, epicClientSecret, epicKid);
          tokenBody = new URLSearchParams({
            grant_type: 'client_credentials',
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            client_assertion: jwt,
          });
        } catch (jwtErr) {
          console.error('Failed to create JWT assertion:', jwtErr);
          return new Response(
            JSON.stringify({ error: 'Failed to create JWT assertion. Check that the private key is valid RSA PEM format.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      } else {
        // Non-PEM credential detected — short-circuit with actionable error
        console.warn('Epic credential is not a PEM private key. Returning hint to caller.');
        return new Response(
          JSON.stringify({
            error: 'Invalid Epic credential format',
            hint: 'Epic Backend System apps require an RSA private key in PEM format, not a client secret. Update your credentials on the Organization Management page (/admin/organizations) with the RSA private key from Epic App Orchard (https://fhir.epic.com/Developer/Apps).',
            code: 'INVALID_CREDENTIAL_FORMAT',
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const tokenRes = await fetch(epicTokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('Epic token exchange failed:', tokenRes.status, errText);
        await auditLog(supabase, 'epic_token_exchange_failed', 'ehr_integrations', { entity_id: entityId, status: tokenRes.status }, req);

        // Provide helpful error message
        const isJwtMode = isPrivateKeyPem(epicClientSecret);
        const hint = isJwtMode
          ? 'Ensure your RSA private key matches the public key uploaded to Epic App Orchard.'
          : 'Epic Backend System apps require a PEM private key, not a client secret. Update your credentials on the Organization Management page with the RSA private key from Epic App Orchard.';

        return new Response(
          JSON.stringify({ error: 'Epic token exchange failed', detail: errText, hint }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const encryptedAccessToken = await encrypt(accessToken);

      // Set up FHIR Subscription for webhook notifications
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

      // Upsert integration record
      const { error: upsertError } = await supabase
        .from('ehr_integrations')
        .upsert(
          {
            entity_id: entityId,
            integration_type: 'epic',
            client_id: epicClientId,
            access_token: encryptedAccessToken,
            refresh_token: null,
            token_expires_at: tokenExpiresAt,
            subscription_id: subscriptionId,
            fhir_base_url: epicFhirBase,
            auth_state: null,
            is_active: true,
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
            .update({
              client_id: epicClientId,
              access_token: encryptedAccessToken,
              refresh_token: null,
              token_expires_at: tokenExpiresAt,
              subscription_id: subscriptionId,
              fhir_base_url: epicFhirBase,
              auth_state: null,
              is_active: true,
            })
            .eq('id', existing.id);
        } else {
          const { error: insertErr } = await supabase.from('ehr_integrations').insert({
            entity_id: entityId,
            integration_type: 'epic',
            client_id: epicClientId,
            access_token: encryptedAccessToken,
            token_expires_at: tokenExpiresAt,
            subscription_id: subscriptionId,
            fhir_base_url: epicFhirBase,
            is_active: true,
          });
          if (insertErr) {
            return new Response(
              JSON.stringify({ error: 'Failed to store integration' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
          }
        }
      }

      await auditLog(supabase, 'epic_connected', 'ehr_integrations', { entity_id: entityId }, req);

      return new Response(
        JSON.stringify({ success: true, message: 'Epic connected successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Flow 2: Disconnect ───
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
    console.error('epic-auth error:', error?.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
