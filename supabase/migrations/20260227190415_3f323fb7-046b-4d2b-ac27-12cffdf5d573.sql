
-- Fix 1: Tighten ehr_integrations RLS - deny all via anon key, only service role (edge functions) can access
DROP POLICY IF EXISTS "Select own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Insert own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Update own integrations" ON public.ehr_integrations;
DROP POLICY IF EXISTS "Delete own integrations" ON public.ehr_integrations;

-- Service-role-only: deny all anon/authenticated access. 
-- Edge functions use service_role_key which bypasses RLS.
CREATE POLICY "Deny all direct access to ehr_integrations"
ON public.ehr_integrations FOR ALL
USING (false)
WITH CHECK (false);

-- Fix 2: Tighten ehr_credentials RLS - same pattern
DROP POLICY IF EXISTS "Org owners can manage EHR credentials" ON public.ehr_credentials;

CREATE POLICY "Deny all direct access to ehr_credentials"
ON public.ehr_credentials FOR ALL
USING (false)
WITH CHECK (false);

-- Fix 3: Restrict entities INSERT to prevent mass registration abuse
-- Keep SELECT as public (required for wallet lookup)
-- Keep INSERT but add length/format validation via trigger
DROP POLICY IF EXISTS "Anyone can register themselves" ON public.entities;

CREATE POLICY "Controlled entity registration"
ON public.entities FOR INSERT
WITH CHECK (
  -- wallet_address must be non-empty and reasonable length
  length(wallet_address) > 0 AND length(wallet_address) <= 100
  AND entity_type IN ('provider', 'patient')
);

-- Fix 4: Restrict entities UPDATE to prevent unauthorized modifications
CREATE POLICY "Entities can update own record"
ON public.entities FOR UPDATE
USING (false)
WITH CHECK (false);
