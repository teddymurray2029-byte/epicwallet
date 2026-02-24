import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const ALLOWED_ORIGINS = [
  'https://carewallet.lovable.app',
  'https://id-preview--63f64bab-d4cb-4037-bbce-9b1e2546fa52.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-epic-signature, x-pcc-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Map EHR event types to our documentation event types
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

const PCC_EVENT_MAP: Record<string, string> = { ...EPIC_EVENT_MAP };

interface EhrEvent {
  eventType: string;
  timestamp: string;
  source?: 'epic' | 'pointclickcare';
  providerNPI?: string;
  providerWallet?: string;
  patientId?: string;
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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pccSignatureHeader = req.headers.get('x-pcc-signature') ?? '';
    const epicSignatureHeader = req.headers.get('x-epic-signature') ?? '';
    const signatureHeader = epicSignatureHeader || pccSignatureHeader;

    if (!signatureHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing signature header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rawBody = await req.text();
    let payload: EhrEvent;
    try {
      payload = JSON.parse(rawBody) as EhrEvent;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sourceEhr: 'epic' | 'pointclickcare' = pccSignatureHeader ? 'pointclickcare' : payload.source === 'pointclickcare' ? 'pointclickcare' : 'epic';

    if (!payload.eventType || !payload.providerWallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
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

    const eventMap = sourceEhr === 'pointclickcare' ? PCC_EVENT_MAP : EPIC_EVENT_MAP;
    const eventType = eventMap[payload.eventType];
    if (!eventType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unknown event type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: provider, error: providerError } = await supabase
      .from('entities')
      .select('id, wallet_address, organization_id')
      .eq('wallet_address', normalizedWallet)
      .maybeSingle();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provider wallet not registered' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from('ehr_integrations')
      .select('webhook_secret')
      .eq('entity_id', provider.id)
      .eq('integration_type', sourceEhr)
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
      await auditLog(supabase, 'webhook_invalid_signature', 'ehr_webhook', { source: sourceEhr }, req, normalizedWallet);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate event hash for deduplication
    const eventData = JSON.stringify({
      eventType: payload.eventType,
      timestamp: new Date(eventTimestampMs).toISOString(),
      providerWallet: normalizedWallet,
      patientId: payload.patientId || null,
    });
    const data = encoder.encode(eventData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const eventHash = toHex(hashBuffer);

    const { data: existingEvent } = await supabase
      .from('documentation_events')
      .select('id')
      .eq('event_hash', eventHash)
      .maybeSingle();

    if (existingEvent) {
      return new Response(
        JSON.stringify({ success: true, message: 'Event already processed', eventId: existingEvent.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create documentation event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await auditLog(supabase, 'ehr_event_processed', 'documentation_events', { event_id: docEvent.id, source: sourceEhr, event_type: eventType }, req, normalizedWallet);

    // Get reward policy
    const { data: policy } = await supabase
      .from('reward_policies')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .maybeSingle();

    if (!policy) {
      return new Response(
        JSON.stringify({ success: true, message: 'Event recorded, no reward policy active', eventId: docEvent.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Network fee
    const { data: networkFeeSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'network_fee')
      .maybeSingle();

    const networkFee = networkFeeSetting?.value as { wallet_address: string; percentage: number } | null;
    const networkFeePercent = networkFee?.percentage || 0;
    const networkFeeAmount = (policy.base_reward * networkFeePercent) / 100;
    const remainingReward = policy.base_reward - networkFeeAmount;

    const organizationId = provider.organization_id;
    let orgCreatorWallet: string | null = null;

    if (organizationId) {
      const { data: organizationEntity } = await supabase
        .from('entities')
        .select('id, metadata')
        .eq('id', organizationId)
        .maybeSingle();

      const metadata = organizationEntity?.metadata as Record<string, unknown> | null;
      orgCreatorWallet =
        (typeof metadata?.creator_wallet_address === 'string' ? metadata.creator_wallet_address : null) ||
        (typeof metadata?.owner_wallet_address === 'string' ? metadata.owner_wallet_address : null) ||
        (typeof metadata?.org_creator_wallet_address === 'string' ? metadata.org_creator_wallet_address : null);
    }

    // Create attestation
    const { data: attestation, error: attError } = await supabase
      .from('attestations')
      .insert({
        event_id: docEvent.id,
        oracle_key_id: (await supabase.from('oracle_keys').select('id').eq('is_active', true).limit(1).single()).data?.id,
        signature: 'pending',
        status: 'pending',
      })
      .select()
      .single();

    if (!attError && attestation) {
      // Network fee distribution
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
          } else {
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
        }
      }

      // Stakeholder rewards
      const providerReward = (remainingReward * policy.provider_split) / 100;
      const organizationReward = (remainingReward * policy.organization_split) / 100;
      const patientReward = (remainingReward * policy.patient_split) / 100;

      await supabase.from('rewards_ledger').insert({
        attestation_id: attestation.id,
        recipient_id: provider.id,
        recipient_type: 'provider',
        amount: providerReward,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      });

      if (organizationReward > 0 && provider.organization_id) {
        await supabase.from('rewards_ledger').insert({
          attestation_id: attestation.id,
          recipient_id: provider.organization_id,
          recipient_type: 'organization',
          amount: organizationReward,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        });
      }

      if (patientReward > 0 && payload.patientId) {
        const { data: patientEntity } = await supabase
          .from('entities')
          .select('id')
          .eq('wallet_address', payload.patientId.toLowerCase())
          .maybeSingle();

        if (patientEntity) {
          await supabase.from('rewards_ledger').insert({
            attestation_id: attestation.id,
            recipient_id: patientEntity.id,
            recipient_type: 'patient',
            amount: patientReward,
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          });
        }
      }
    }

    const providerRewardForResponse = (remainingReward * policy.provider_split) / 100;
    const orgRewardForResponse = (remainingReward * policy.organization_split) / 100;
    const patientRewardForResponse = (remainingReward * policy.patient_split) / 100;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'EHR event processed successfully',
        eventId: docEvent.id,
        reward: {
          provider: providerRewardForResponse,
          organization: orgRewardForResponse,
          patient: patientRewardForResponse,
        },
        networkFee: networkFeeAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error');
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
