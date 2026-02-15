
-- Add OAuth and subscription columns to ehr_integrations
ALTER TABLE public.ehr_integrations
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_id text,
  ADD COLUMN IF NOT EXISTS auth_state text;

-- Make client_id nullable since magic link flow sets it automatically
ALTER TABLE public.ehr_integrations ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.ehr_integrations ALTER COLUMN client_id SET DEFAULT '';
