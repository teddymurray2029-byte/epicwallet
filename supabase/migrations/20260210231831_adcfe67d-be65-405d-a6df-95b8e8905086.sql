
-- SECURITY FIX: Tighten ehr_integrations (contains secrets like client_id, webhook_secret)
DROP POLICY IF EXISTS "Entities can delete their own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Entities can insert their own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Entities can update their own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Entities can view their own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Authenticated users can view own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON public.ehr_integrations;

CREATE POLICY "Select own integrations"
ON public.ehr_integrations FOR SELECT
USING (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Insert own integrations"
ON public.ehr_integrations FOR INSERT
WITH CHECK (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Update own integrations"
ON public.ehr_integrations FOR UPDATE
USING (entity_id IN (SELECT id FROM public.entities));

CREATE POLICY "Delete own integrations"
ON public.ehr_integrations FOR DELETE
USING (entity_id IN (SELECT id FROM public.entities));

-- SECURITY FIX: Tighten organization_invites update
DROP POLICY IF EXISTS "Anyone can update invites" ON public.organization_invites;

CREATE POLICY "Creators and recipients can update invites"
ON public.organization_invites FOR UPDATE
USING (
  created_by IN (SELECT id FROM public.entities)
  OR used_by IS NULL
);
