ALTER TABLE public.entities
  ADD CONSTRAINT entities_single_organization_check
  CHECK (
    (entity_type IN ('provider', 'patient') AND organization_id IS NOT NULL)
    OR (entity_type IN ('organization', 'admin') AND organization_id IS NULL)
  );
