
-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_wallet text,
  actor_entity_id uuid,
  resource_type text NOT NULL,
  resource_id text,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No public insert - service role only
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

-- Tighten outreach_contacts
DROP POLICY IF EXISTS "Anyone can insert outreach contacts" ON public.outreach_contacts;
DROP POLICY IF EXISTS "Anyone can update outreach contacts" ON public.outreach_contacts;
DROP POLICY IF EXISTS "Anyone can delete outreach contacts" ON public.outreach_contacts;

CREATE POLICY "Admins can insert outreach contacts"
  ON public.outreach_contacts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update outreach contacts"
  ON public.outreach_contacts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete outreach contacts"
  ON public.outreach_contacts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tighten outreach_calls
DROP POLICY IF EXISTS "Anyone can insert outreach calls" ON public.outreach_calls;
DROP POLICY IF EXISTS "Anyone can update outreach calls" ON public.outreach_calls;

CREATE POLICY "Admins can insert outreach calls"
  ON public.outreach_calls FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update outreach calls"
  ON public.outreach_calls FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
