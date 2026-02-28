import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
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

    const organizationId = url.searchParams.get('org');
    const clientId = url.searchParams.get('client_id');

    // Epic may call this URL without preserving query params.
    // So we support:
    // 1) org=... (preferred)
    // 2) client_id=...
    // 3) no params => return all public Epic keys
    if (organizationId) {
      const { data, error } = await supabase
        .from('ehr_credentials')
        .select('public_key_jwks')
        .eq('organization_id', organizationId)
        .eq('ehr_type', 'epic')
        .maybeSingle();

      if (error || !data?.public_key_jwks) {
        return new Response(JSON.stringify({ keys: [] }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify(data.public_key_jwks), { headers: corsHeaders });
    }

    if (clientId) {
      const { data, error } = await supabase
        .from('ehr_credentials')
        .select('public_key_jwks')
        .eq('client_id', clientId)
        .eq('ehr_type', 'epic')
        .maybeSingle();

      if (error || !data?.public_key_jwks) {
        return new Response(JSON.stringify({ keys: [] }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify(data.public_key_jwks), { headers: corsHeaders });
    }

    const { data: rows, error } = await supabase
      .from('ehr_credentials')
      .select('public_key_jwks')
      .eq('ehr_type', 'epic')
      .not('public_key_jwks', 'is', null);

    if (error || !rows?.length) {
      return new Response(JSON.stringify({ keys: [] }), { headers: corsHeaders });
    }

    const keys = rows
      .flatMap((row: any) => Array.isArray(row?.public_key_jwks?.keys) ? row.public_key_jwks.keys : [])
      .filter((k: any) => k?.kty === 'RSA' && k?.n && k?.e);

    // Deduplicate by kid + modulus
    const deduped = keys.filter((k: any, idx: number, arr: any[]) =>
      arr.findIndex((x: any) => x?.kid === k?.kid && x?.n === k?.n) === idx,
    );

    return new Response(JSON.stringify({ keys: deduped }), { headers: corsHeaders });
  } catch (err) {
    console.error('epic-jwks error:', err?.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders },
    );
  }
});
