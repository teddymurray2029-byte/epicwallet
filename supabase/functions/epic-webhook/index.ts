import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-epic-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map Epic event types to our documentation event types
const EPIC_EVENT_MAP: Record<string, string> = {
  'encounter.complete': 'encounter_note',
  'medication.reconciliation': 'medication_reconciliation',
  'discharge.summary': 'discharge_summary',
  'problem.update': 'problem_list_update',
  'order.verified': 'orders_verified',
  'preventive.care': 'preventive_care',
  'coding.finalized': 'coding_finalized',
  'intake.completed': 'intake_completed',
  'consent.signed': 'consent_signed',
  'followup.completed': 'follow_up_completed',
};

interface EpicEvent {
  eventType: string;
  timestamp: string;
  providerNPI?: string;
  providerWallet?: string;
  patientId?: string; // Hashed/anonymized patient ID
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

const MAX_EVENT_AGE_MS = 5 * 60 * 1000;

const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

const parseTimestamp = (timestamp?: string) => {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? null : parsed;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signatureHeader = req.headers.get('x-epic-signature') ?? '';
    if (!signatureHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing signature header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rawBody = await req.text();
    let payload: EpicEvent;
    try {
      payload = JSON.parse(rawBody) as EpicEvent;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    console.log('Received Epic event:', payload.eventType);

    // Validate required fields
    if (!payload.eventType || !payload.providerWallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: eventType and providerWallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedWallet = payload.providerWallet.toLowerCase();
    const eventTimestampMs = parseTimestamp(payload.timestamp);
    if (!eventTimestampMs) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const eventAgeMs = Math.abs(Date.now() - eventTimestampMs);
    if (eventAgeMs > MAX_EVENT_AGE_MS) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event timestamp outside allowed window' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Map Epic event type to our event type
    const eventType = EPIC_EVENT_MAP[payload.eventType];
    if (!eventType) {
      console.log('Unknown Epic event type:', payload.eventType);
      return new Response(
        JSON.stringify({ success: false, error: `Unknown event type: ${payload.eventType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the provider entity by wallet address
    const { data: provider, error: providerError } = await supabase
      .from('entities')
      .select('id, wallet_address, organization_id')
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (providerError || !provider) {
      console.error('Provider not found:', payload.providerWallet);
      return new Response(
        JSON.stringify({ success: false, error: 'Provider wallet not registered' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from('ehr_integrations')
      .select('webhook_secret')
      .eq('entity_id', provider.id)
      .eq('integration_type', 'epic')
      .maybeSingle();

    if (integrationError || !integration?.webhook_secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook secret not configured' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(integration.webhook_secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const computedSignature = toHex(signature);
    const signatureValid = timingSafeEqual(
      encoder.encode(computedSignature),
      encoder.encode(signatureHeader.trim()),
    );

    if (!signatureValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate event hash (for deduplication and attestation)
    const eventData = JSON.stringify({
      eventType: payload.eventType,
      timestamp: new Date(eventTimestampMs).toISOString(),
      providerWallet: normalizedWallet,
      patientId: payload.patientId || null,
    });
    const data = encoder.encode(eventData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const eventHash = toHex(hashBuffer);

    // Check for duplicate events
    const { data: existingEvent } = await supabase
      .from('documentation_events')
      .select('id')
      .eq('event_hash', eventHash)
      .maybeSingle();

    if (existingEvent) {
      console.log('Duplicate event detected:', eventHash);
      return new Response(
        JSON.stringify({ success: true, message: 'Event already processed', eventId: existingEvent.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create documentation event
    const { data: docEvent, error: docError } = await supabase
      .from('documentation_events')
      .insert({
        event_type: eventType,
        event_hash: eventHash,
        event_timestamp: new Date(eventTimestampMs).toISOString(),
        provider_id: provider.id,
        organization_id: provider.organization_id,
        metadata: payload.metadata || {},
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating documentation event:', docError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create documentation event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created documentation event:', docEvent.id);

    // Get reward policy for this event type
    const { data: policy } = await supabase
      .from('reward_policies')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .maybeSingle();

    if (!policy) {
      console.log('No active reward policy for event type:', eventType);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Event recorded, no reward policy active',
          eventId: docEvent.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get network fee configuration
    const { data: networkFeeSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'network_fee')
      .maybeSingle();

    const networkFee = networkFeeSetting?.value as { wallet_address: string; percentage: number } | null;
    const networkFeePercent = networkFee?.percentage || 0;

    // Calculate network fee and remaining reward
    const networkFeeAmount = (policy.base_reward * networkFeePercent) / 100;
    const remainingReward = policy.base_reward - networkFeeAmount;

    const organizationId = provider.organization_id;
    let orgCreatorWallet: string | null = null;

    if (organizationId) {
      const { data: organizationEntity } = await supabase
        .from('entities')
        .select('id, creator_wallet_address, metadata')
        .eq('id', organizationId)
        .maybeSingle();

      const metadata = organizationEntity?.metadata as Record<string, unknown> | null;
      const metadataWallet = typeof metadata?.creator_wallet_address === 'string'
        ? metadata.creator_wallet_address
        : typeof metadata?.owner_wallet_address === 'string'
          ? metadata.owner_wallet_address
          : typeof metadata?.org_creator_wallet_address === 'string'
            ? metadata.org_creator_wallet_address
            : null;

      orgCreatorWallet = organizationEntity?.creator_wallet_address || metadataWallet || null;
    }

    // Create attestation (pending - will be confirmed when signed on-chain)
    const { data: attestation, error: attError } = await supabase
      .from('attestations')
      .insert({
        event_id: docEvent.id,
        oracle_key_id: (await supabase.from('oracle_keys').select('id').eq('is_active', true).limit(1).single()).data?.id,
        signature: 'pending', // Will be replaced with actual signature
        status: 'pending',
      })
      .select()
      .single();

    if (attError) {
      console.error('Error creating attestation:', attError);
      // Event was still created, just no attestation
    } else {
      // Create network fee ledger entry (split treasury fee: 25% org creator, 75% treasury)
      if (networkFee && networkFeeAmount > 0) {
        let orgCreatorBonus = (networkFeeAmount * 25) / 100;
        let treasuryAmount = networkFeeAmount - orgCreatorBonus;

        if (orgCreatorWallet) {
          const { data: orgCreatorEntity } = await supabase
            .from('entities')
            .select('id, entity_type')
            .eq('wallet_address', orgCreatorWallet.toLowerCase())
            .maybeSingle();

          if (orgCreatorEntity) {
            await supabase.from('rewards_ledger').insert({
              attestation_id: attestation.id,
              recipient_id: orgCreatorEntity.id,
              recipient_type: orgCreatorEntity.entity_type,
              amount: orgCreatorBonus,
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            });
            console.log('Created org creator bonus:', orgCreatorBonus, 'CARE for', orgCreatorWallet);
          } else {
            console.warn('Org creator wallet entity not found:', orgCreatorWallet);
            orgCreatorBonus = 0;
            treasuryAmount = networkFeeAmount;
          }
        } else {
          orgCreatorBonus = 0;
          treasuryAmount = networkFeeAmount;
        }

        const { data: networkEntity } = await supabase
          .from('entities')
          .select('id')
          .eq('wallet_address', networkFee.wallet_address.toLowerCase())
          .maybeSingle();

        if (networkEntity && treasuryAmount > 0) {
          await supabase.from('rewards_ledger').insert({
            attestation_id: attestation.id,
            recipient_id: networkEntity.id,
            recipient_type: 'admin',
            amount: treasuryAmount,
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          });
          console.log('Created network fee:', treasuryAmount, 'CARE for treasury');
        } else {
          console.warn('Network fee wallet entity not found:', networkFee.wallet_address);
        }
      }

      // Calculate provider reward from remaining amount (after network fee)
      const providerReward = (remainingReward * policy.provider_split) / 100;

      // Create reward ledger entry for provider
      await supabase.from('rewards_ledger').insert({
        attestation_id: attestation.id,
        recipient_id: provider.id,
        recipient_type: 'provider',
        amount: providerReward,
        status: 'confirmed', // In mock mode, confirm immediately
        confirmed_at: new Date().toISOString(),
      });

      console.log('Created reward:', providerReward, 'CARE for provider (after', networkFeePercent, '% network fee)');
    }

    // Calculate provider reward for response (after network fee)
    const providerRewardForResponse = (remainingReward * policy.provider_split) / 100;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Epic event processed successfully',
        eventId: docEvent.id,
        reward: providerRewardForResponse,
        networkFee: networkFeeAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing Epic webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
