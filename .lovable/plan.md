

# Plan: Virtual Card Issuance, Fiat Off-Ramp, and Transaction Receipt PDFs

## Overview

Three financial features to complete the CARE-to-fiat pipeline: hardening the virtual card flow, adding a standalone fiat off-ramp page, and generating downloadable PDF receipts for transactions.

---

## 1. Harden Virtual Card Issuance

**Current state:** The `/provider/card` page and `virtual-card` edge function exist with both Stripe Issuing and a demo fallback. The demo mode works but lacks transaction history tracking and conversion limits.

**Changes:**

- **New DB table `card_transactions`**: Track every conversion (CARE to USD) and card load event with columns: `id`, `entity_id`, `card_id`, `care_amount`, `usd_amount`, `fee_amount`, `status`, `created_at`. This gives an auditable history of all card-related financial activity.
- **Update `virtual-card` edge function**: After each successful conversion (both demo and Stripe modes), insert a row into `card_transactions`. Add a new `history` action that returns recent card transactions for the entity.
- **Update VirtualCard.tsx UI**: Add a "Recent Card Activity" section below the conversion panel showing the last 10 card loads with date, CARE amount, USD received, and fee paid.
- **Add daily conversion limits**: Enforce a max of 50,000 CARE per day per entity in the edge function, checking against `card_transactions` for the current day.

---

## 2. Fiat Off-Ramp Page

**Current state:** The virtual card is the only way to spend CARE. There is no direct bank withdrawal / cash-out option.

**Changes:**

- **New page `src/pages/provider/FiatOfframp.tsx`** at route `/provider/offramp`:
  - Shows the user's current CARE balance (on-chain + earned).
  - A conversion form: enter CARE amount, see estimated USD after the 1% fee.
  - Two off-ramp options displayed as selectable cards:
    1. **Load Virtual Card** -- redirects to `/provider/card`.
    2. **Bank Transfer (Coming Soon)** -- disabled card with "notify me" button (stores interest in `system_settings`).
  - Conversion rate display and fee breakdown (same as virtual card page).
- **Add sidebar nav item**: Add "Cash Out" with a `Banknote` icon between "Virtual Card" and "Leaderboard" in the provider nav.
- **Add route** in `App.tsx`.

---

## 3. Transaction Receipt PDFs

**Current state:** The Transactions page (`/provider/transactions`) has CSV export but no individual receipt download.

**Changes:**

- **New edge function `generate-receipt`**: Accepts a `reward_id`, fetches the reward ledger entry + attestation + documentation event data, and generates a PDF receipt using a simple HTML-to-PDF approach via Deno. The PDF includes:
  - CareWallet header/logo text
  - Receipt number (reward ID truncated)
  - Date, amount, status, recipient type
  - Transaction hash (if confirmed)
  - Event type and attestation details
  - Fee breakdown (if conversion)
  - Footer: "This receipt is generated for record-keeping purposes."
- **Update ProviderTransactions.tsx**: Add a download icon button on each confirmed transaction row that calls `supabase.functions.invoke('generate-receipt', { body: { reward_id } })` and triggers a browser download of the returned PDF blob.
- **Update PatientHistory.tsx**: Same download button for patient transaction rows.

---

## Technical Details

### Database Migration

```text
CREATE TABLE public.card_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL,
  card_id text,
  care_amount numeric NOT NULL,
  usd_amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view their own card transactions (matched via entities table)
CREATE POLICY "Users can view own card transactions"
  ON public.card_transactions FOR SELECT
  USING (entity_id IN (SELECT id FROM public.entities));

-- Service role inserts (from edge function)
CREATE POLICY "Service role can insert card transactions"
  ON public.card_transactions FOR INSERT
  WITH CHECK (false);
```

### Edge Function: generate-receipt

- Uses Deno's built-in capabilities to create a simple PDF by rendering an HTML template and converting it.
- Falls back to returning an HTML receipt if PDF generation proves complex, which the browser can print-to-PDF.
- Endpoint returns `Content-Type: application/pdf` (or `text/html` fallback) with `Content-Disposition: attachment`.

### File Changes Summary

| File | Action |
|------|--------|
| `card_transactions` table | Create (migration) |
| `supabase/functions/virtual-card/index.ts` | Edit -- add `history` action, insert into `card_transactions` on convert |
| `supabase/functions/generate-receipt/index.ts` | Create -- PDF receipt generator |
| `supabase/config.toml` | Edit -- add `generate-receipt` function config |
| `src/pages/provider/VirtualCard.tsx` | Edit -- add card transaction history section |
| `src/pages/provider/FiatOfframp.tsx` | Create -- off-ramp page |
| `src/pages/provider/ProviderTransactions.tsx` | Edit -- add per-row receipt download button |
| `src/pages/patient/PatientHistory.tsx` | Edit -- add per-row receipt download button |
| `src/components/layout/AppSidebar.tsx` | Edit -- add "Cash Out" nav item |
| `src/App.tsx` | Edit -- add `/provider/offramp` route |

