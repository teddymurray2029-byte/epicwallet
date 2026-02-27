import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reward_id } = await req.json();
    if (!reward_id) {
      return new Response(JSON.stringify({ error: 'reward_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch reward
    const { data: reward, error: rewardErr } = await supabase
      .from('rewards_ledger')
      .select('*')
      .eq('id', reward_id)
      .single();

    if (rewardErr || !reward) {
      return new Response(JSON.stringify({ error: 'Reward not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recipient entity
    const { data: entity } = await supabase
      .from('entities')
      .select('display_name, wallet_address, entity_type')
      .eq('id', reward.recipient_id)
      .single();

    // Fetch attestation
    const { data: attestation } = await supabase
      .from('attestations')
      .select('*, documentation_events(*)')
      .eq('id', reward.attestation_id)
      .single();

    const event = attestation?.documentation_events;
    const receiptDate = new Date(reward.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const receiptNumber = reward.id.slice(0, 8).toUpperCase();

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>CareWallet Receipt #${receiptNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: 700; color: #0d9488; }
  .logo span { color: #1a1a2e; }
  .receipt-label { text-align: right; }
  .receipt-label h2 { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
  .receipt-label p { font-size: 13px; color: #888; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 10px; font-weight: 600; }
  .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #666; }
  .detail-value { font-weight: 500; text-align: right; max-width: 60%; word-break: break-all; }
  .amount-highlight { font-size: 28px; font-weight: 700; color: #0d9488; text-align: center; padding: 20px; background: linear-gradient(135deg, #f0fdfa, #e0f2fe); border-radius: 12px; margin: 20px 0; }
  .amount-highlight small { display: block; font-size: 12px; color: #666; font-weight: 400; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .status-confirmed { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .tx-hash { font-family: monospace; font-size: 11px; background: #f5f5f5; padding: 8px 12px; border-radius: 6px; word-break: break-all; margin-top: 8px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 11px; color: #999; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Care<span>Wallet</span></div>
    <div class="receipt-label">
      <h2>Transaction Receipt</h2>
      <p>#${receiptNumber}</p>
    </div>
  </div>

  <div class="amount-highlight">
    +${Number(reward.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
    <small>${reward.recipient_type} Reward</small>
  </div>

  <div class="section">
    <div class="section-title">Transaction Details</div>
    <div class="detail-row">
      <span class="detail-label">Date</span>
      <span class="detail-value">${receiptDate}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value"><span class="status-badge status-${reward.status}">${reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}</span></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Recipient Type</span>
      <span class="detail-value" style="text-transform: capitalize;">${reward.recipient_type}</span>
    </div>
    ${reward.confirmed_at ? `<div class="detail-row">
      <span class="detail-label">Confirmed At</span>
      <span class="detail-value">${new Date(reward.confirmed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    </div>` : ''}
  </div>

  ${entity ? `<div class="section">
    <div class="section-title">Recipient</div>
    <div class="detail-row">
      <span class="detail-label">Name</span>
      <span class="detail-value">${entity.display_name || 'N/A'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Wallet</span>
      <span class="detail-value" style="font-family: monospace; font-size: 12px;">${entity.wallet_address}</span>
    </div>
  </div>` : ''}

  ${event ? `<div class="section">
    <div class="section-title">Documentation Event</div>
    <div class="detail-row">
      <span class="detail-label">Event Type</span>
      <span class="detail-value" style="text-transform: capitalize;">${(event.event_type || '').replace(/_/g, ' ')}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Event Date</span>
      <span class="detail-value">${new Date(event.event_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  </div>` : ''}

  ${reward.tx_hash ? `<div class="section">
    <div class="section-title">Blockchain</div>
    <div class="tx-hash">${reward.tx_hash}</div>
  </div>` : ''}

  <div class="footer">
    <p>This receipt is generated for record-keeping purposes.</p>
    <p style="margin-top: 4px;">CareWallet · Healthcare Rewards Platform · Polygon Network</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="CareWallet-Receipt-${receiptNumber}.html"`,
      },
    });
  } catch (err) {
    console.error('Receipt error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate receipt' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
