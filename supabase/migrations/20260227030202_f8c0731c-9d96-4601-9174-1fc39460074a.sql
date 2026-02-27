
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

CREATE POLICY "Users can view own card transactions"
  ON public.card_transactions FOR SELECT
  USING (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Service role can insert card transactions"
  ON public.card_transactions FOR INSERT
  WITH CHECK (false);
