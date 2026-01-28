-- Create table for EHR integration settings (Epic, Cerner, etc.)
CREATE TABLE public.ehr_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL DEFAULT 'epic',
  client_id TEXT NOT NULL,
  webhook_secret TEXT,
  fhir_base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.ehr_integrations ENABLE ROW LEVEL SECURITY;

-- Entities can view/manage their own integrations
CREATE POLICY "Entities can view their own integrations"
ON public.ehr_integrations
FOR SELECT
USING (true);

CREATE POLICY "Entities can insert their own integrations"
ON public.ehr_integrations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Entities can update their own integrations"
ON public.ehr_integrations
FOR UPDATE
USING (true);

CREATE POLICY "Entities can delete their own integrations"
ON public.ehr_integrations
FOR DELETE
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_ehr_integrations_updated_at
BEFORE UPDATE ON public.ehr_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();