-- Create enum for entity types
CREATE TYPE public.entity_type AS ENUM ('provider', 'patient', 'organization', 'admin');

-- Create enum for user roles (separate from entity type for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for event types
CREATE TYPE public.documentation_event_type AS ENUM (
  'encounter_note',
  'medication_reconciliation',
  'discharge_summary',
  'problem_list_update',
  'orders_verified',
  'preventive_care',
  'coding_finalized',
  'intake_completed',
  'consent_signed',
  'follow_up_completed'
);

-- Create enum for attestation status
CREATE TYPE public.attestation_status AS ENUM ('pending', 'confirmed', 'rejected', 'expired');

-- Entities table: Maps wallet addresses to entity types
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  entity_type entity_type NOT NULL,
  organization_id UUID REFERENCES public.entities(id),
  display_name TEXT,
  metadata JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Reward policies table: Configurable rules per event type
CREATE TABLE public.reward_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type documentation_event_type NOT NULL UNIQUE,
  base_reward DECIMAL(18, 8) NOT NULL DEFAULT 10,
  provider_split DECIMAL(5, 2) NOT NULL DEFAULT 60.00,
  organization_split DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
  patient_split DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  daily_limit_per_provider INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT splits_sum_100 CHECK (provider_split + organization_split + patient_split = 100.00)
);

-- Oracle keys table: Allowlisted public keys for attestation verification
CREATE TABLE public.oracle_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.entities(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Documentation events table: Off-chain record of healthcare events
CREATE TABLE public.documentation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type documentation_event_type NOT NULL,
  event_hash TEXT NOT NULL UNIQUE,
  provider_id UUID REFERENCES public.entities(id) NOT NULL,
  patient_id UUID REFERENCES public.entities(id),
  organization_id UUID REFERENCES public.entities(id),
  event_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attestations table: Signed attestations linking events to reward distributions
CREATE TABLE public.attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.documentation_events(id) NOT NULL,
  oracle_key_id UUID REFERENCES public.oracle_keys(id) NOT NULL,
  signature TEXT NOT NULL,
  status attestation_status NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- Rewards ledger table: Complete audit trail of all reward distributions
CREATE TABLE public.rewards_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_id UUID REFERENCES public.attestations(id) NOT NULL,
  recipient_id UUID REFERENCES public.entities(id) NOT NULL,
  recipient_type entity_type NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  tx_hash TEXT,
  status attestation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- System settings table for mock mode toggle
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES 
  ('mock_mode', '{"enabled": true}'::jsonb),
  ('system_paused', '{"paused": false}'::jsonb);

-- Insert default reward policies
INSERT INTO public.reward_policies (event_type, base_reward, provider_split, organization_split, patient_split) VALUES
  ('encounter_note', 10.00, 60.00, 25.00, 15.00),
  ('medication_reconciliation', 8.00, 60.00, 25.00, 15.00),
  ('discharge_summary', 15.00, 60.00, 25.00, 15.00),
  ('problem_list_update', 5.00, 60.00, 25.00, 15.00),
  ('orders_verified', 7.00, 60.00, 25.00, 15.00),
  ('preventive_care', 12.00, 60.00, 25.00, 15.00),
  ('coding_finalized', 10.00, 60.00, 25.00, 15.00),
  ('intake_completed', 3.00, 20.00, 20.00, 60.00),
  ('consent_signed', 2.00, 20.00, 20.00, 60.00),
  ('follow_up_completed', 5.00, 40.00, 20.00, 40.00);

-- Enable RLS on all tables
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get entity by wallet address
CREATE OR REPLACE FUNCTION public.get_entity_by_wallet(_wallet_address TEXT)
RETURNS public.entities
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.entities WHERE wallet_address = _wallet_address LIMIT 1
$$;

-- RLS Policies

-- Entities: Anyone can read, only admins can write
CREATE POLICY "Anyone can view entities" ON public.entities FOR SELECT USING (true);
CREATE POLICY "Admins can manage entities" ON public.entities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles: Users can view their own, admins can manage all
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reward policies: Anyone can read, admins can write
CREATE POLICY "Anyone can view reward policies" ON public.reward_policies FOR SELECT USING (true);
CREATE POLICY "Admins can manage reward policies" ON public.reward_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Oracle keys: Anyone can read active, admins can manage
CREATE POLICY "Anyone can view active oracle keys" ON public.oracle_keys FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage oracle keys" ON public.oracle_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Documentation events: Related entities can view
CREATE POLICY "Related entities can view events" ON public.documentation_events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.documentation_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Attestations: Anyone can view, only system can create
CREATE POLICY "Anyone can view attestations" ON public.attestations FOR SELECT USING (true);
CREATE POLICY "Admins can manage attestations" ON public.attestations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rewards ledger: Recipients can view their own, admins can view all
CREATE POLICY "Anyone can view rewards" ON public.rewards_ledger FOR SELECT USING (true);
CREATE POLICY "Admins can manage rewards" ON public.rewards_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- System settings: Anyone can read, admins can write
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_entities_wallet ON public.entities(wallet_address);
CREATE INDEX idx_entities_type ON public.entities(entity_type);
CREATE INDEX idx_events_provider ON public.documentation_events(provider_id);
CREATE INDEX idx_events_patient ON public.documentation_events(patient_id);
CREATE INDEX idx_events_hash ON public.documentation_events(event_hash);
CREATE INDEX idx_rewards_recipient ON public.rewards_ledger(recipient_id);
CREATE INDEX idx_attestations_event ON public.attestations(event_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reward_policies_updated_at BEFORE UPDATE ON public.reward_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();