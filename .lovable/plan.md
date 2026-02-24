

# HIPAA Compliance Hardening Plan

This plan addresses the key technical safeguards required by the HIPAA Security Rule and Privacy Rule for your CareCoin healthcare application. HIPAA compliance involves both technical controls (what we can implement in code) and administrative/organizational policies (which you'll need to handle separately, like Business Associate Agreements with vendors).

---

## What We Will Implement

### 1. Audit Logging Table and Edge Function

Create an `audit_logs` table to track all access to sensitive data (EHR integrations, patient-related events, credential changes). HIPAA requires maintaining audit trails of who accessed what and when.

- **New table**: `audit_logs` with columns for `action`, `actor_wallet`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `timestamp`, `details`
- **RLS**: Only admins can read audit logs; insert allowed via service role from edge functions
- **Edge function updates**: Add audit log entries in `epic-auth`, `pointclickcare-auth`, `epic-webhook`, `manage-ehr-credentials`, and `virtual-card` for key actions (OAuth initiated, tokens exchanged, credentials saved/deleted, webhook events processed)

### 2. Automatic Session Timeout (Frontend)

HIPAA requires automatic logoff after a period of inactivity.

- Add an **inactivity timer** (15 minutes) to `WalletContext.tsx` that disconnects the wallet and clears sensitive state
- Show a warning toast 2 minutes before timeout

### 3. Sanitize Console Logging in Edge Functions

Remove or redact all `console.log` and `console.warn` statements that could leak PHI or sensitive tokens. Currently, edge functions log:
- Wallet addresses alongside event types
- OAuth state tokens and integration IDs
- Full error details that could contain patient data

Changes across all edge functions:
- Remove payload details from log messages
- Redact wallet addresses to show only first 6 and last 4 characters
- Never log access tokens, refresh tokens, or client secrets
- Log only event IDs and generic status messages

### 4. Tighten Overly Permissive RLS Policies

The linter found 6 policies using `true` for INSERT/UPDATE/DELETE. These need restricting:

| Table | Current Policy | Fix |
|-------|---------------|-----|
| `outreach_contacts` | INSERT/UPDATE/DELETE all use `true` | Restrict to admin role only |
| `outreach_calls` | INSERT/UPDATE use `true` | Restrict to admin role only |
| `entities` | INSERT uses `true` (for self-registration) | Keep but add rate-limiting check |
| `organization_invites` | UPDATE uses weak check | Tighten to creator-only + token match |

### 5. Restrict CORS Headers

All edge functions currently use `Access-Control-Allow-Origin: '*'`. For HIPAA, restrict to your known domains:
- `https://carewallet.lovable.app`
- The preview URL

### 6. Encrypt Sensitive Fields at Rest

EHR credentials (`client_secret`), OAuth tokens (`access_token`, `refresh_token`), and webhook secrets are stored in plaintext. Add application-level encryption:

- Create a utility in edge functions to encrypt/decrypt using an `ENCRYPTION_KEY` secret (AES-256-GCM)
- Update `epic-auth`, `pointclickcare-auth`, and `manage-ehr-credentials` to encrypt tokens before storing and decrypt when reading
- Add a new `ENCRYPTION_KEY` secret (you'll be prompted to set it)

### 7. Add Security Headers to Frontend

Add a `_headers` file in `/public` to set:
- `Strict-Transport-Security` (force HTTPS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (restrict script sources)
- `Cache-Control: no-store` on sensitive pages

### 8. Add HIPAA Compliance Banner/Notice

Add a small compliance notice component in the dashboard footer indicating the system handles data in accordance with HIPAA requirements and displaying a link to your privacy policy.

---

## What You Will Need to Handle Separately (Non-Code)

These are organizational requirements Lovable cannot implement but are critical for HIPAA:

- **Business Associate Agreement (BAA)** with your cloud infrastructure provider
- **Risk Assessment** documentation
- **Breach Notification procedures**
- **Workforce training** on PHI handling
- **Privacy Policy** document linked from the app

---

## Technical Details

### New Database Migration

```sql
-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_wallet text,
  actor_entity_id uuid,
  resource_type text NOT NULL,
  resource_id text,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts (no public insert)
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

-- Tighten outreach tables
DROP POLICY IF EXISTS "Anyone can insert outreach contacts" ON public.outreach_contacts;
DROP POLICY IF EXISTS "Anyone can update outreach contacts" ON public.outreach_contacts;
DROP POLICY IF EXISTS "Anyone can delete outreach contacts" ON public.outreach_contacts;

CREATE POLICY "Admins can insert outreach contacts"
  ON public.outreach_contacts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update outreach contacts"
  ON public.outreach_contacts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete outreach contacts"
  ON public.outreach_contacts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can insert outreach calls" ON public.outreach_calls;
DROP POLICY IF EXISTS "Anyone can update outreach calls" ON public.outreach_calls;

CREATE POLICY "Admins can insert outreach calls"
  ON public.outreach_calls FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update outreach calls"
  ON public.outreach_calls FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Files to Create
- `public/_headers` -- security headers
- `src/hooks/useInactivityTimeout.ts` -- session timeout hook
- `src/components/layout/HipaaNotice.tsx` -- compliance footer

### Files to Modify
- `supabase/functions/epic-webhook/index.ts` -- sanitize logs, add audit logging, restrict CORS
- `supabase/functions/epic-auth/index.ts` -- sanitize logs, add audit logging, restrict CORS, encrypt tokens
- `supabase/functions/pointclickcare-auth/index.ts` -- same as above
- `supabase/functions/manage-ehr-credentials/index.ts` -- sanitize logs, add audit logging, restrict CORS, encrypt secrets
- `supabase/functions/virtual-card/index.ts` -- sanitize logs, restrict CORS
- `src/contexts/WalletContext.tsx` -- integrate inactivity timeout
- `src/components/layout/DashboardLayout.tsx` -- add HIPAA notice
- `src/App.tsx` -- no changes needed

### New Secret Required
- `ENCRYPTION_KEY` -- a 32-byte hex string for AES-256-GCM encryption of sensitive fields

