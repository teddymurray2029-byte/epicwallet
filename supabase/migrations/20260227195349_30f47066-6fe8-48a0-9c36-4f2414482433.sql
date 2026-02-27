
-- Create a safe view for EHR integration status (excludes sensitive tokens/secrets)
-- This allows the client to check which EHRs are connected without exposing credentials
CREATE OR REPLACE VIEW public.ehr_integration_status
WITH (security_invoker = false) AS
SELECT 
  id,
  entity_id,
  integration_type,
  is_active,
  created_at,
  updated_at,
  fhir_base_url
FROM public.ehr_integrations;

-- Grant SELECT on view to anon and authenticated roles
GRANT SELECT ON public.ehr_integration_status TO anon;
GRANT SELECT ON public.ehr_integration_status TO authenticated;
