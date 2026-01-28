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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the Epic event payload
    const payload: EpicEvent = await req.json();
    console.log('Received Epic event:', payload.eventType);

    // Validate required fields
    if (!payload.eventType || !payload.providerWallet) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: eventType and providerWallet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      .eq('wallet_address', payload.providerWallet.toLowerCase())
      .maybeSingle();

    if (providerError || !provider) {
      console.error('Provider not found:', payload.providerWallet);
      return new Response(
        JSON.stringify({ success: false, error: 'Provider wallet not registered' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate event hash (for deduplication and attestation)
    const eventData = JSON.stringify({
      eventType: payload.eventType,
      timestamp: payload.timestamp,
      providerWallet: payload.providerWallet,
      patientId: payload.patientId || null,
    });
    const encoder = new TextEncoder();
    const data = encoder.encode(eventData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const eventHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
        event_timestamp: payload.timestamp || new Date().toISOString(),
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
      // Calculate rewards
      const providerReward = (policy.base_reward * policy.provider_split) / 100;

      // Create reward ledger entry for provider
      await supabase.from('rewards_ledger').insert({
        attestation_id: attestation.id,
        recipient_id: provider.id,
        recipient_type: 'provider',
        amount: providerReward,
        status: 'confirmed', // In mock mode, confirm immediately
        confirmed_at: new Date().toISOString(),
      });

      console.log('Created reward:', providerReward, 'CARE for provider');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Epic event processed successfully',
        eventId: docEvent.id,
        reward: policy ? (policy.base_reward * policy.provider_split) / 100 : 0,
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
