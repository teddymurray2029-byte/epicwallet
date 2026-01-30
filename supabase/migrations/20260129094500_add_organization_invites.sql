-- Create organization invites table for shareable invite links
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.entities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.entities(id)
);

-- Enable RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Policies (open read/write for now to match existing anon flows)
CREATE POLICY "Anyone can view organization invites" ON public.organization_invites
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create organization invites" ON public.organization_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update organization invites" ON public.organization_invites
  FOR UPDATE USING (true);
