
CREATE TABLE public.ehr_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  ehr_type text NOT NULL CHECK (ehr_type IN ('epic', 'pointclickcare')),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, ehr_type)
);

ALTER TABLE public.ehr_credentials ENABLE ROW LEVEL SECURITY;

-- RLS: Allow all operations for the organization entity's own wallet
CREATE POLICY "Org owners can manage EHR credentials"
  ON public.ehr_credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.entities e
      WHERE e.id = ehr_credentials.organization_id
        AND e.entity_type = 'organization'
    )
  );

-- Service role bypass is implicit, edge functions using service key will have full access

-- Trigger for updated_at
CREATE TRIGGER update_ehr_credentials_updated_at
  BEFORE UPDATE ON public.ehr_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
