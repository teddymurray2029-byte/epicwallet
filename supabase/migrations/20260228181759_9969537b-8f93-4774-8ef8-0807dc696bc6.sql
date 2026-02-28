
-- Store Stripe Connect account IDs for entities
CREATE TABLE public.stripe_connect_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connect account"
  ON public.stripe_connect_accounts FOR SELECT
  USING (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Service role can manage connect accounts"
  ON public.stripe_connect_accounts FOR ALL
  USING (false)
  WITH CHECK (false);

-- Track bank withdrawal requests
CREATE TABLE public.bank_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL,
  care_amount numeric NOT NULL,
  usd_amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_payout_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.bank_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.bank_withdrawals FOR SELECT
  USING (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Service role can manage withdrawals"
  ON public.bank_withdrawals FOR ALL
  USING (false)
  WITH CHECK (false);

-- Trigger for updated_at on connect accounts
CREATE TRIGGER update_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
