import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_RATE = 0.01;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { care_amount } = await req.json();
    if (!care_amount || care_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid care_amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch platform rate from system_settings
    let rate = DEFAULT_RATE;
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'care_usd_rate')
        .maybeSingle();

      if (data?.value?.rate && typeof data.value.rate === 'number') {
        rate = data.value.rate;
      }
    } catch {
      // Use default rate on error
    }

    const usd_amount = care_amount * rate;

    return new Response(JSON.stringify({
      rate,
      care_amount,
      usd_amount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('care-price error:', err);
    return new Response(JSON.stringify({ error: String(err).slice(0, 200) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
