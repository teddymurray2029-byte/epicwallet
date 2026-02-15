
-- Outreach contacts: healthcare facilities to call
CREATE TABLE public.outreach_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_name TEXT NOT NULL,
  contact_name TEXT,
  phone_number TEXT NOT NULL,
  email TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view outreach contacts"
  ON public.outreach_contacts FOR SELECT USING (true);

CREATE POLICY "Anyone can insert outreach contacts"
  ON public.outreach_contacts FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update outreach contacts"
  ON public.outreach_contacts FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete outreach contacts"
  ON public.outreach_contacts FOR DELETE USING (true);

CREATE TRIGGER update_outreach_contacts_updated_at
  BEFORE UPDATE ON public.outreach_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outreach call logs
CREATE TABLE public.outreach_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  twilio_call_sid TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  duration_seconds INTEGER,
  transcript JSONB DEFAULT '[]'::jsonb,
  outcome TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view outreach calls"
  ON public.outreach_calls FOR SELECT USING (true);

CREATE POLICY "Anyone can insert outreach calls"
  ON public.outreach_calls FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update outreach calls"
  ON public.outreach_calls FOR UPDATE USING (true);
