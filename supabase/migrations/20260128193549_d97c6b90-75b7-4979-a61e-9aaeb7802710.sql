-- Allow anyone to insert their own entity record (for testing/development)
-- This policy allows self-registration when mock_mode is enabled
CREATE POLICY "Anyone can register themselves"
ON public.entities
FOR INSERT
WITH CHECK (true);