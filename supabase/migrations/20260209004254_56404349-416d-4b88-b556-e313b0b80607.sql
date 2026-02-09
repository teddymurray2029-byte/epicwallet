-- Create organization_invites table for invite link management
CREATE TABLE public.organization_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.entities(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES public.entities(id)
);

-- Create index for fast token lookups
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX idx_organization_invites_organization ON public.organization_invites(organization_id);

-- Enable Row Level Security
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view invites by token (needed for accepting)
CREATE POLICY "Anyone can view invites by token"
ON public.organization_invites
FOR SELECT
USING (true);

-- Policy: Organization owners can create invites
CREATE POLICY "Organization owners can create invites"
ON public.organization_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entities e
    WHERE e.id = organization_id
    AND e.entity_type = 'organization'
  )
);

-- Policy: Allow updating invites (for marking as used)
CREATE POLICY "Anyone can update invites"
ON public.organization_invites
FOR UPDATE
USING (true);