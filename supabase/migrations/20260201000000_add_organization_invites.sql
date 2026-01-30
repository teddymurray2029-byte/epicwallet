-- Organization invites for onboarding members
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.entities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.entities(id)
);

CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX idx_organization_invites_org ON public.organization_invites(organization_id);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Allow invite management in demo mode (no auth linkage to wallet)
CREATE POLICY "Anyone can view organization invites"
ON public.organization_invites
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create organization invites"
ON public.organization_invites
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update organization invites"
ON public.organization_invites
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow members to update their organization assignment
CREATE POLICY "Anyone can update entities"
ON public.entities
FOR UPDATE
USING (true)
WITH CHECK (true);
