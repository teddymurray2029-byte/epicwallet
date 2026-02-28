import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'org parameter is required' }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data, error } = await supabase
      .from('ehr_credentials')
      .select('public_key_jwks')
      .eq('organization_id', organizationId)
      .eq('ehr_type', 'epic')
      .maybeSingle();

    if (error || !data?.public_key_jwks) {
      return new Response(
        JSON.stringify({ keys: [] }),
        { headers: corsHeaders },
      );
    }

    // Return the JWKS directly — it should already be { keys: [...] }
    const jwks = data.public_key_jwks;
    return new Response(
      JSON.stringify(jwks),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error('epic-jwks error:', err?.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders },
    );
  }
});
