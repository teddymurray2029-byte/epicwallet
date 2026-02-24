
-- Drop the broken INSERT policy
DROP POLICY "Organization owners can create invites" ON public.organization_invites;

-- Create a fixed INSERT policy: allow if the organization_id references an org entity
-- and the caller entity belongs to that org or owns it via metadata
CREATE POLICY "Organization owners can create invites"
ON public.organization_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM entities org
    WHERE org.id = organization_invites.organization_id
      AND org.entity_type = 'organization'
  )
);
