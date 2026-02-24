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

    const organizationId = url.searchParams.get('organization_id');
    const walletAddress = url.searchParams.get('wallet_address');

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Authorization: verify caller's wallet owns the organization
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

      return new Response(
        JSON.stringify({ configured }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // POST: Save/update credentials
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

      const { error: upsertError } = await supabase
        .from('ehr_credentials')
        .upsert(
          {
            organization_id: organizationId,
            ehr_type,
            client_id: client_id.trim(),
            client_secret: client_secret.trim(),
          },
          { onConflict: 'organization_id,ehr_type' },
        );

      if (upsertError) {
        console.error('Failed to save credentials:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

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
        console.error('Failed to delete credentials:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

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
    console.error('manage-ehr-credentials error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
