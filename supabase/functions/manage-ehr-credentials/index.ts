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

// ─── Encryption helpers (AES-256-GCM) ───
async function getEncryptionKey(): Promise<CryptoKey | null> {
  const hexKey = Deno.env.get('ENCRYPTION_KEY');
  if (!hexKey) return null;
  const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) return plaintext; // fallback: store as-is if no key
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
    return ciphertextB64; // not encrypted or wrong key — return as-is
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

    const organizationId = url.searchParams.get('organization_id');
    const walletAddress = url.searchParams.get('wallet_address');

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'wallet_address is required for authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: org, error: orgError } = await supabase
      .from('entities')
      .select('id, entity_type, wallet_address')
      .eq('id', organizationId)
      .eq('entity_type', 'organization')
      .maybeSingle();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (org.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      await auditLog(supabase, 'unauthorized_credential_access', 'ehr_credentials', { organization_id: organizationId }, req, walletAddress);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: wallet does not own this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // GET: Check which EHR types have credentials configured
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('ehr_credentials')
        .select('ehr_type')
        .eq('organization_id', organizationId);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch credentials status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const configured: Record<string, boolean> = { epic: false, pointclickcare: false };
      if (data) {
        for (const row of data) {
          configured[row.ehr_type] = true;
        }
      }

      await auditLog(supabase, 'view_ehr_credentials', 'ehr_credentials', { organization_id: organizationId }, req, walletAddress);

      return new Response(
        JSON.stringify({ configured }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // POST: Save/update credentials (encrypted)
    if (req.method === 'POST') {
      const body = await req.json();
      const { ehr_type, client_id, client_secret } = body;

      if (!ehr_type || !client_id || !client_secret) {
        return new Response(
          JSON.stringify({ error: 'ehr_type, client_id, and client_secret are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!['epic', 'pointclickcare'].includes(ehr_type)) {
        return new Response(
          JSON.stringify({ error: 'ehr_type must be epic or pointclickcare' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const encryptedSecret = await encrypt(client_secret.trim());

      const { error: upsertError } = await supabase
        .from('ehr_credentials')
        .upsert(
          {
            organization_id: organizationId,
            ehr_type,
            client_id: client_id.trim(),
            client_secret: encryptedSecret,
          },
          { onConflict: 'organization_id,ehr_type' },
        );

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to save credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await auditLog(supabase, 'save_ehr_credentials', 'ehr_credentials', { ehr_type, organization_id: organizationId }, req, walletAddress);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // DELETE: Remove credentials
    if (req.method === 'DELETE') {
      const ehrType = url.searchParams.get('ehr_type');
      if (!ehrType || !['epic', 'pointclickcare'].includes(ehrType)) {
        return new Response(
          JSON.stringify({ error: 'ehr_type query parameter is required (epic or pointclickcare)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: deleteError } = await supabase
        .from('ehr_credentials')
        .delete()
        .eq('organization_id', organizationId)
        .eq('ehr_type', ehrType);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await auditLog(supabase, 'delete_ehr_credentials', 'ehr_credentials', { ehr_type: ehrType, organization_id: organizationId }, req, walletAddress);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('manage-ehr-credentials error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
