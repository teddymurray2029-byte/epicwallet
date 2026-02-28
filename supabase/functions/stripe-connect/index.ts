import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Stripe not configured" }, 500);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    const { action, entity_id, wallet_address, care_amount } = await req.json();

    // Verify wallet ownership
    if (entity_id && wallet_address) {
      const { data: ent } = await supabase
        .from("entities")
        .select("wallet_address")
        .eq("id", entity_id)
        .single();
      if (!ent || ent.wallet_address.toLowerCase() !== wallet_address.toLowerCase()) {
        return json({ error: "Wallet mismatch" }, 403);
      }
    }

    switch (action) {
      case "create-account": {
        // Create a Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: "express",
          capabilities: {
            transfers: { requested: true },
          },
          metadata: { entity_id, wallet_address },
        });

        // Store in DB
        await supabase.from("stripe_connect_accounts").upsert(
          {
            entity_id,
            stripe_account_id: account.id,
            onboarding_complete: false,
            payouts_enabled: false,
          },
          { onConflict: "entity_id" },
        );

        // Create onboarding link
        const origin = req.headers.get("origin") || "https://carewallet.lovable.app";
        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${origin}/provider/offramp`,
          return_url: `${origin}/provider/offramp?onboarding=complete`,
          type: "account_onboarding",
        });

        return json({ url: accountLink.url, account_id: account.id });
      }

      case "check-status": {
        const { data: conn } = await supabase
          .from("stripe_connect_accounts")
          .select("*")
          .eq("entity_id", entity_id)
          .single();

        if (!conn) return json({ connected: false });

        // Refresh status from Stripe
        const account = await stripe.accounts.retrieve(conn.stripe_account_id);
        const payouts_enabled = account.payouts_enabled ?? false;
        const onboarding_complete = account.details_submitted ?? false;

        // Update DB if changed
        if (conn.payouts_enabled !== payouts_enabled || conn.onboarding_complete !== onboarding_complete) {
          await supabase
            .from("stripe_connect_accounts")
            .update({ payouts_enabled, onboarding_complete })
            .eq("entity_id", entity_id);
        }

        return json({
          connected: true,
          payouts_enabled,
          onboarding_complete,
          account_id: conn.stripe_account_id,
        });
      }

      case "onboarding-link": {
        const { data: conn } = await supabase
          .from("stripe_connect_accounts")
          .select("stripe_account_id")
          .eq("entity_id", entity_id)
          .single();

        if (!conn) return json({ error: "No Connect account found" }, 404);

        const origin = req.headers.get("origin") || "https://carewallet.lovable.app";
        const accountLink = await stripe.accountLinks.create({
          account: conn.stripe_account_id,
          refresh_url: `${origin}/provider/offramp`,
          return_url: `${origin}/provider/offramp?onboarding=complete`,
          type: "account_onboarding",
        });

        return json({ url: accountLink.url });
      }

      case "withdraw": {
        if (!care_amount || care_amount <= 0) return json({ error: "Invalid amount" }, 400);

        const { data: conn } = await supabase
          .from("stripe_connect_accounts")
          .select("*")
          .eq("entity_id", entity_id)
          .single();

        if (!conn?.payouts_enabled) {
          return json({ error: "Payouts not enabled. Complete onboarding first." }, 400);
        }

        const usdRate = 0.01;
        const grossUsd = care_amount * usdRate;
        const fee = grossUsd * 0.01;
        const netUsd = grossUsd - fee;
        const netCents = Math.round(netUsd * 100);

        if (netCents < 100) return json({ error: "Minimum withdrawal is $1.00 USD" }, 400);

        // Daily limit check (50,000 CARE)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayWithdrawals } = await supabase
          .from("bank_withdrawals")
          .select("care_amount")
          .eq("entity_id", entity_id)
          .gte("created_at", today.toISOString())
          .in("status", ["pending", "completed"]);

        const dailyTotal = (todayWithdrawals || []).reduce((s, r) => s + Number(r.care_amount), 0);
        if (dailyTotal + care_amount > 50000) {
          return json({ error: `Daily limit exceeded. ${50000 - dailyTotal} CARE remaining today.` }, 400);
        }

        // Create a transfer to the connected account
        try {
          const transfer = await stripe.transfers.create({
            amount: netCents,
            currency: "usd",
            destination: conn.stripe_account_id,
            metadata: { entity_id, care_amount: String(care_amount) },
          });

          // Record withdrawal
          await supabase.from("bank_withdrawals").insert({
            entity_id,
            care_amount,
            usd_amount: netUsd,
            fee_amount: fee,
            status: "completed",
            stripe_payout_id: transfer.id,
          });

          // Audit
          await supabase.from("audit_logs").insert({
            action: "bank_withdrawal",
            actor_entity_id: entity_id,
            actor_wallet: wallet_address,
            resource_type: "bank_withdrawal",
            resource_id: transfer.id,
            details: { care_amount, usd_amount: netUsd, fee_amount: fee },
          });

          return json({
            success: true,
            transfer_id: transfer.id,
            care_amount,
            usd_amount: netUsd,
            fee_amount: fee,
          });
        } catch (stripeErr: any) {
          // Handle insufficient balance in test mode
          if (stripeErr?.code === "balance_insufficient") {
            return json({
              error: "Platform balance insufficient. In Stripe test mode, create a charge using card 4000000000000077 to add funds.",
            }, 400);
          }
          // Record failed withdrawal
          await supabase.from("bank_withdrawals").insert({
            entity_id,
            care_amount,
            usd_amount: netUsd,
            fee_amount: fee,
            status: "failed",
          });
          throw stripeErr;
        }
      }

      case "history": {
        const { data: withdrawals } = await supabase
          .from("bank_withdrawals")
          .select("*")
          .eq("entity_id", entity_id)
          .order("created_at", { ascending: false })
          .limit(20);

        return json({ withdrawals: withdrawals || [] });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("stripe-connect error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
