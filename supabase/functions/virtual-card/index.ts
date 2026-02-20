import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, entity_id, wallet_address, care_amount, card_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if Stripe Issuing is configured
    if (!stripeKey) {
      // Return demo/mock data when Stripe Issuing isn't configured yet
      return handleDemoMode(action, entity_id, wallet_address, care_amount, supabase);
    }

    // Production mode with Stripe Issuing
    try {
      switch (action) {
        case 'get':
          return await handleGetCard(stripeKey, entity_id, supabase);
        case 'create':
          return await handleCreateCard(stripeKey, entity_id, wallet_address, supabase);
        case 'convert':
          return await handleConvert(stripeKey, entity_id, wallet_address, care_amount, supabase);
        case 'freeze':
          return await handleFreezeCard(stripeKey, card_id, true);
        case 'unfreeze':
          return await handleFreezeCard(stripeKey, card_id, false);
        default:
          return jsonResponse({ error: 'Invalid action' }, 400);
      }
    } catch (stripeErr) {
      // If Stripe Issuing isn't enabled, fall back to demo mode
      const errMsg = String(stripeErr);
      if (errMsg.includes('not set up to use Issuing') || errMsg.includes('Issuing')) {
        console.warn('Stripe Issuing not enabled, falling back to demo mode:', errMsg);
        return handleDemoMode(action, entity_id, wallet_address, care_amount, supabase);
      }
      throw stripeErr;
    }
  } catch (err) {
    console.error('Virtual card error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// Demo mode when Stripe isn't configured — returns simulated card data
async function handleDemoMode(
  action: string,
  entity_id: string,
  wallet_address: string,
  care_amount: number | undefined,
  supabase: any
) {
  switch (action) {
    case 'get': {
      // Check if we have a "demo card" stored in system_settings
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `virtual_card_${entity_id}`)
        .maybeSingle();

      if (data?.value) {
        return jsonResponse({ card: data.value });
      }
      return jsonResponse({ card: null });
    }

    case 'create': {
      const demoCard = {
        id: `ic_demo_${crypto.randomUUID().slice(0, 8)}`,
        last4: String(Math.floor(1000 + Math.random() * 9000)),
        exp_month: new Date().getMonth() + 1,
        exp_year: new Date().getFullYear() + 3,
        brand: 'Visa',
        status: 'active',
        spending_limit: 5000,
        usd_balance: 0,
      };

      await supabase.from('system_settings').upsert({
        key: `virtual_card_${entity_id}`,
        value: demoCard,
      }, { onConflict: 'key' });

      return jsonResponse({ card: demoCard });
    }

    case 'convert': {
      if (!care_amount || care_amount <= 0) {
        return jsonResponse({ error: 'Invalid amount' }, 400);
      }

      const usdRate = 0.01; // 1 CARE = $0.01
      const fee = 0.01; // 1% network fee
      const usdAmount = care_amount * usdRate * (1 - fee);

      // Update demo card balance
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `virtual_card_${entity_id}`)
        .maybeSingle();

      if (!data?.value) {
        return jsonResponse({ error: 'No card found' }, 400);
      }

      const updatedCard = {
        ...data.value,
        usd_balance: (data.value.usd_balance || 0) + usdAmount,
      };

      await supabase.from('system_settings').upsert({
        key: `virtual_card_${entity_id}`,
        value: updatedCard,
      }, { onConflict: 'key' });

      return jsonResponse({
        success: true,
        care_amount,
        usdc_amount: care_amount * usdRate,
        usd_loaded: usdAmount,
        new_balance: updatedCard.usd_balance,
      });
    }

    case 'freeze':
    case 'unfreeze': {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `virtual_card_${entity_id}`)
        .maybeSingle();

      if (data?.value) {
        const updatedCard = { ...data.value, status: action === 'freeze' ? 'frozen' : 'active' };
        await supabase.from('system_settings').upsert({
          key: `virtual_card_${entity_id}`,
          value: updatedCard,
        }, { onConflict: 'key' });
      }

      return jsonResponse({ success: true });
    }

    default:
      return jsonResponse({ error: 'Invalid action' }, 400);
  }
}

// Production Stripe Issuing handlers
async function handleGetCard(stripeKey: string, entity_id: string, supabase: any) {
  // Look up cardholder by entity metadata
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', `stripe_card_${entity_id}`)
    .maybeSingle();

  if (!settings?.value?.card_id) {
    return jsonResponse({ card: null });
  }

  const card = await stripeRequest(stripeKey, `issuing/cards/${settings.value.card_id}`, 'GET');

  return jsonResponse({
    card: {
      id: card.id,
      last4: card.last4,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      brand: card.brand || 'Visa',
      status: card.status === 'canceled' ? 'inactive' : card.status,
      spending_limit: card.spending_controls?.spending_limits?.[0]?.amount || 500000,
      usd_balance: settings.value.usd_balance || 0,
    },
  });
}

async function handleCreateCard(stripeKey: string, entity_id: string, wallet_address: string, supabase: any) {
  // Get entity info for cardholder creation
  const { data: entity } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entity_id)
    .single();

  if (!entity) {
    return jsonResponse({ error: 'Entity not found' }, 404);
  }

  // Create Stripe cardholder
  const cardholder = await stripeRequest(stripeKey, 'issuing/cardholders', 'POST', {
    type: 'individual',
    name: entity.display_name || `Provider ${wallet_address.slice(0, 8)}`,
    email: `${wallet_address.toLowerCase()}@carecoin.app`,
    status: 'active',
    billing: {
      address: {
        line1: '1 CareCoin Way',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94111',
        country: 'US',
      },
    },
    metadata: { entity_id, wallet_address },
  });

  // Create virtual card
  const card = await stripeRequest(stripeKey, 'issuing/cards', 'POST', {
    cardholder: cardholder.id,
    currency: 'usd',
    type: 'virtual',
    status: 'active',
    spending_controls: {
      spending_limits: [{ amount: 500000, interval: 'monthly' }],
    },
    metadata: { entity_id, wallet_address },
  });

  // Store mapping
  await supabase.from('system_settings').upsert({
    key: `stripe_card_${entity_id}`,
    value: { card_id: card.id, cardholder_id: cardholder.id, usd_balance: 0 },
  }, { onConflict: 'key' });

  return jsonResponse({
    card: {
      id: card.id,
      last4: card.last4,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      brand: 'Visa',
      status: 'active',
      spending_limit: 5000,
      usd_balance: 0,
    },
  });
}

async function handleConvert(stripeKey: string, entity_id: string, wallet_address: string, care_amount: number, supabase: any) {
  if (!care_amount || care_amount <= 0) {
    return jsonResponse({ error: 'Invalid amount' }, 400);
  }

  const usdRate = 0.01;
  const fee = 0.01;
  const usdAmount = care_amount * usdRate * (1 - fee);
  const usdCents = Math.round(usdAmount * 100);

  // Get card info
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', `stripe_card_${entity_id}`)
    .maybeSingle();

  if (!settings?.value?.card_id) {
    return jsonResponse({ error: 'No card found' }, 400);
  }

  // In production: here you would call a DEX or liquidity pool to swap CARE → USDC
  // Then use Stripe Treasury to fund the card from the USDC→USD proceeds
  // For now, update the tracked balance

  const newBalance = (settings.value.usd_balance || 0) + usdAmount;

  await supabase.from('system_settings').upsert({
    key: `stripe_card_${entity_id}`,
    value: { ...settings.value, usd_balance: newBalance },
  }, { onConflict: 'key' });

  return jsonResponse({
    success: true,
    care_amount,
    usdc_amount: care_amount * usdRate,
    usd_loaded: usdAmount,
    new_balance: newBalance,
  });
}

async function handleFreezeCard(stripeKey: string, card_id: string, freeze: boolean) {
  const card = await stripeRequest(stripeKey, `issuing/cards/${card_id}`, 'POST', {
    status: freeze ? 'inactive' : 'active',
  });

  return jsonResponse({ success: true, status: card.status });
}

// Stripe API helper
async function stripeRequest(secretKey: string, endpoint: string, method: string, body?: any) {
  const url = `https://api.stripe.com/v1/${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${secretKey}`,
  };

  let bodyStr: string | undefined;
  if (body && method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    bodyStr = flattenToFormData(body);
  }

  const res = await fetch(url, { method, headers, body: bodyStr });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Stripe error [${res.status}]: ${JSON.stringify(data)}`);
  }

  return data;
}

function flattenToFormData(obj: any, prefix = ''): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      parts.push(flattenToFormData(value, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
