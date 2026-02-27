import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed =
    origin === 'https://carewallet.lovable.app' ||
    origin.includes('63f64bab-d4cb-4037-bbce-9b1e2546fa52');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://carewallet.lovable.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

function redactWallet(w: string | null | undefined): string {
  if (!w) return '[none]';
  return w.length > 10 ? `${w.slice(0, 6)}…${w.slice(-4)}` : '[short]';
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

const DAILY_LIMIT_CARE = 50000;

async function checkDailyLimit(supabase: any, entity_id: string, care_amount: number): Promise<{ allowed: boolean; remaining: number }> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('card_transactions')
    .select('care_amount')
    .eq('entity_id', entity_id)
    .gte('created_at', todayStart.toISOString());

  const usedToday = (data || []).reduce((sum: number, r: any) => sum + Number(r.care_amount), 0);
  const remaining = DAILY_LIMIT_CARE - usedToday;
  return { allowed: care_amount <= remaining, remaining };
}

async function insertCardTransaction(supabase: any, entity_id: string, card_id: string | null, care_amount: number, usd_amount: number, fee_amount: number) {
  await supabase.from('card_transactions').insert({
    entity_id,
    card_id,
    care_amount,
    usd_amount,
    fee_amount,
    status: 'completed',
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, entity_id, wallet_address, care_amount, card_id } = await req.json();

    if (!entity_id || typeof entity_id !== 'string') {
      return jsonResponse({ error: 'entity_id is required' }, 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify wallet ownership: entity must belong to the claimed wallet
    if (wallet_address && action !== 'history' && action !== 'get') {
      const { data: entityRecord } = await supabase
        .from('entities')
        .select('wallet_address')
        .eq('id', entity_id)
        .single();

      if (!entityRecord || entityRecord.wallet_address !== wallet_address.toLowerCase()) {
        await auditLog(supabase, 'unauthorized_card_access', 'virtual_card', { entity_id, claimed_wallet: redactWallet(wallet_address) }, req, wallet_address);
        return jsonResponse({ error: 'Unauthorized: wallet does not match entity' }, 403, corsHeaders);
      }
    }

    if (!stripeKey) {
      return handleDemoMode(action, entity_id, wallet_address, care_amount, supabase, req, corsHeaders);
    }

    try {
      switch (action) {
        case 'get':
          return await handleGetCard(stripeKey, entity_id, supabase, corsHeaders);
        case 'create':
          await auditLog(supabase, 'virtual_card_created', 'virtual_card', { entity_id }, req, wallet_address);
          return await handleCreateCard(stripeKey, entity_id, wallet_address, supabase, corsHeaders);
        case 'convert':
          await auditLog(supabase, 'care_to_usd_conversion', 'virtual_card', { entity_id, care_amount }, req, wallet_address);
          return await handleConvert(stripeKey, entity_id, wallet_address, care_amount, supabase, corsHeaders);
        case 'freeze':
          await auditLog(supabase, 'card_frozen', 'virtual_card', { card_id }, req, wallet_address);
          return await handleFreezeCard(stripeKey, card_id, true, corsHeaders);
        case 'unfreeze':
          await auditLog(supabase, 'card_unfrozen', 'virtual_card', { card_id }, req, wallet_address);
          return await handleFreezeCard(stripeKey, card_id, false, corsHeaders);
        case 'history':
          return await handleHistory(entity_id, supabase, corsHeaders);
        default:
          return jsonResponse({ error: 'Invalid action' }, 400, corsHeaders);
      }
    } catch (stripeErr) {
      const errMsg = String(stripeErr);
      if (errMsg.includes('Issuing') || errMsg.includes('[403]') || errMsg.includes('[404]') || errMsg.includes('capability') || errMsg.includes('not set up')) {
        return handleDemoMode(action, entity_id, wallet_address, care_amount, supabase, req, corsHeaders);
      }
      throw stripeErr;
    }
  } catch (err) {
    console.error('Virtual card error');
    return jsonResponse({ error: 'Internal server error' }, 500, getCorsHeaders(req));
  }
});

async function handleHistory(entity_id: string, supabase: any, corsHeaders: Record<string, string>) {
  const { data, error } = await supabase
    .from('card_transactions')
    .select('*')
    .eq('entity_id', entity_id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return jsonResponse({ error: 'Failed to fetch history' }, 500, corsHeaders);
  }
  return jsonResponse({ transactions: data || [] }, 200, corsHeaders);
}

async function handleDemoMode(
  action: string,
  entity_id: string,
  wallet_address: string,
  care_amount: number | undefined,
  supabase: any,
  req: Request,
  corsHeaders: Record<string, string>,
) {
  switch (action) {
    case 'get': {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `virtual_card_${entity_id}`)
        .maybeSingle();

      return jsonResponse({ card: data?.value || null }, 200, corsHeaders);
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

      await auditLog(supabase, 'demo_card_created', 'virtual_card', { entity_id }, req, wallet_address);
      return jsonResponse({ card: demoCard }, 200, corsHeaders);
    }

    case 'convert': {
      if (!care_amount || care_amount <= 0) {
        return jsonResponse({ error: 'Invalid amount' }, 400, corsHeaders);
      }

      const limit = await checkDailyLimit(supabase, entity_id, care_amount);
      if (!limit.allowed) {
        return jsonResponse({ error: `Daily limit exceeded. Remaining: ${limit.remaining.toLocaleString()} CARE` }, 400, corsHeaders);
      }

      const usdRate = 0.01;
      const fee = 0.01;
      const feeAmount = care_amount * usdRate * fee;
      const usdAmount = care_amount * usdRate * (1 - fee);

      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', `virtual_card_${entity_id}`)
        .maybeSingle();

      if (!data?.value) {
        return jsonResponse({ error: 'No card found' }, 400, corsHeaders);
      }

      const updatedCard = {
        ...data.value,
        usd_balance: (data.value.usd_balance || 0) + usdAmount,
      };

      await supabase.from('system_settings').upsert({
        key: `virtual_card_${entity_id}`,
        value: updatedCard,
      }, { onConflict: 'key' });

      await insertCardTransaction(supabase, entity_id, data.value.id || null, care_amount, usdAmount, feeAmount);

      return jsonResponse({
        success: true,
        care_amount,
        usdc_amount: care_amount * usdRate,
        usd_loaded: usdAmount,
        new_balance: updatedCard.usd_balance,
      }, 200, corsHeaders);
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

      return jsonResponse({ success: true }, 200, corsHeaders);
    }

    case 'history':
      return await handleHistory(entity_id, supabase, corsHeaders);

    default:
      return jsonResponse({ error: 'Invalid action' }, 400, corsHeaders);
  }
}

async function handleGetCard(stripeKey: string, entity_id: string, supabase: any, corsHeaders: Record<string, string>) {
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', `stripe_card_${entity_id}`)
    .maybeSingle();

  if (!settings?.value?.card_id) {
    return jsonResponse({ card: null }, 200, corsHeaders);
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
  }, 200, corsHeaders);
}

async function handleCreateCard(stripeKey: string, entity_id: string, wallet_address: string, supabase: any, corsHeaders: Record<string, string>) {
  const { data: entity } = await supabase
    .from('entities')
    .select('*')
    .eq('id', entity_id)
    .single();

  if (!entity) {
    return jsonResponse({ error: 'Entity not found' }, 404, corsHeaders);
  }

  const cardholder = await stripeRequest(stripeKey, 'issuing/cardholders', 'POST', {
    type: 'individual',
    name: entity.display_name || `Provider ${redactWallet(wallet_address)}`,
    email: `${wallet_address.toLowerCase()}@carecoin.app`,
    status: 'active',
    billing: {
      address: { line1: '1 CareCoin Way', city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
    },
    metadata: { entity_id, wallet_address: redactWallet(wallet_address) },
  });

  const card = await stripeRequest(stripeKey, 'issuing/cards', 'POST', {
    cardholder: cardholder.id,
    currency: 'usd',
    type: 'virtual',
    status: 'active',
    spending_controls: { spending_limits: [{ amount: 500000, interval: 'monthly' }] },
    metadata: { entity_id },
  });

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
  }, 200, corsHeaders);
}

async function handleConvert(stripeKey: string, entity_id: string, wallet_address: string, care_amount: number, supabase: any, corsHeaders: Record<string, string>) {
  if (!care_amount || care_amount <= 0) {
    return jsonResponse({ error: 'Invalid amount' }, 400, corsHeaders);
  }

  const limit = await checkDailyLimit(supabase, entity_id, care_amount);
  if (!limit.allowed) {
    return jsonResponse({ error: `Daily limit exceeded. Remaining: ${limit.remaining.toLocaleString()} CARE` }, 400, corsHeaders);
  }

  const usdRate = 0.01;
  const fee = 0.01;
  const feeAmount = care_amount * usdRate * fee;
  const usdAmount = care_amount * usdRate * (1 - fee);

  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', `stripe_card_${entity_id}`)
    .maybeSingle();

  if (!settings?.value?.card_id) {
    return jsonResponse({ error: 'No card found' }, 400, corsHeaders);
  }

  const newBalance = (settings.value.usd_balance || 0) + usdAmount;

  await supabase.from('system_settings').upsert({
    key: `stripe_card_${entity_id}`,
    value: { ...settings.value, usd_balance: newBalance },
  }, { onConflict: 'key' });

  await insertCardTransaction(supabase, entity_id, settings.value.card_id, care_amount, usdAmount, feeAmount);

  return jsonResponse({
    success: true,
    care_amount,
    usdc_amount: care_amount * usdRate,
    usd_loaded: usdAmount,
    new_balance: newBalance,
  }, 200, corsHeaders);
}

async function handleFreezeCard(stripeKey: string, card_id: string, freeze: boolean, corsHeaders: Record<string, string>) {
  const card = await stripeRequest(stripeKey, `issuing/cards/${card_id}`, 'POST', {
    status: freeze ? 'inactive' : 'active',
  });

  return jsonResponse({ success: true, status: card.status }, 200, corsHeaders);
}

async function stripeRequest(secretKey: string, endpoint: string, method: string, body?: any) {
  const url = `https://api.stripe.com/v1/${endpoint}`;
  const headers: Record<string, string> = { 'Authorization': `Bearer ${secretKey}` };

  let bodyStr: string | undefined;
  if (body && method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    bodyStr = flattenToFormData(body);
  }

  const res = await fetch(url, { method, headers, body: bodyStr });
  const data = await res.json();

  if (!res.ok) {
    const errBody = data?.error?.message || JSON.stringify(data);
    throw new Error(`Stripe error [${res.status}]: ${errBody}`);
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

function jsonResponse(data: any, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
