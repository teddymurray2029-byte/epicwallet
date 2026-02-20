

## Add Admin EHR Credentials Setup

### Problem
The "PointClickCare Not Configured" / "Epic Not Configured" alerts tell providers to ask their admin, but there is no admin screen to enter OAuth credentials. The secrets (`EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`, `PCC_CLIENT_ID`, `PCC_CLIENT_SECRET`) currently can only be set through backend secret management, which admins don't have access to.

### Solution
Add an "EHR Credentials" section to the existing Admin Organizations page (`/admin/organizations`) where the organization owner can enter their Epic and PointClickCare OAuth Client ID and Client Secret. These values will be stored in a new secure backend table and read by the auth edge functions instead of relying on environment variables.

### What Changes

**1. New database table: `ehr_credentials`**
- Columns: `id`, `organization_id`, `ehr_type` (epic/pointclickcare), `client_id`, `client_secret` (encrypted at rest), `created_at`, `updated_at`
- Unique constraint on `(organization_id, ehr_type)`
- RLS: only the organization owner can read/write their own credentials

**2. New edge function: `manage-ehr-credentials`**
- POST: Save/update credentials (organization owner only, validates entity ownership)
- GET: Check if credentials exist for a given org (returns `{ configured: true/false }` without exposing secrets)
- Stores the actual client_id and client_secret in the `ehr_credentials` table

**3. Update `epic-auth` and `pointclickcare-auth` edge functions**
- Before checking environment variables, query `ehr_credentials` table for the entity's organization
- Fall back to env vars (`EPIC_CLIENT_ID` etc.) if no row found in the table
- This way both approaches work: admin UI credentials OR platform-level env var secrets

**4. Update Organizations page UI**
- Add a new card below the existing "Epic API connection" card
- Two sections: Epic OAuth and PointClickCare OAuth
- Each has Client ID and Client Secret input fields (secret field masked)
- "Save" button per EHR type
- Green checkmark when credentials are saved
- Only visible to organization owners

**5. Update the provider-facing alert**
- Change the alert text from "Admin needs to set up OAuth credentials" to include a more helpful message like "Ask your organization admin to configure credentials on the Organization Management page"

### Technical Details

**Database migration:**
```sql
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

CREATE POLICY "Org owners can manage their EHR credentials"
  ON public.ehr_credentials
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.entities
      WHERE entity_type = 'organization'
      AND wallet_address = (current_setting('request.jwt.claims', true)::json->>'sub')
    )
  );
```

**Edge function credential lookup (added to epic-auth / pointclickcare-auth):**
```typescript
// Look up org-level credentials first
const { data: creds } = await supabase
  .from('ehr_credentials')
  .select('client_id, client_secret')
  .eq('organization_id', entity.organization_id)
  .eq('ehr_type', 'epic')
  .maybeSingle();

const clientId = creds?.client_id || Deno.env.get('EPIC_CLIENT_ID');
const clientSecret = creds?.client_secret || Deno.env.get('EPIC_CLIENT_SECRET');
```

**Files to create:**
- `supabase/functions/manage-ehr-credentials/index.ts`

**Files to modify:**
- `src/pages/admin/Organizations.tsx` -- Add EHR credentials card
- `supabase/functions/epic-auth/index.ts` -- Query ehr_credentials table as primary source
- `supabase/functions/pointclickcare-auth/index.ts` -- Same change
- `supabase/config.toml` -- Add manage-ehr-credentials function config

### User Experience
- Organization admin navigates to Organization Management page
- Scrolls to "EHR Credentials" section
- Enters Client ID and Client Secret for Epic and/or PointClickCare
- Clicks Save -- credentials are stored securely
- Providers on the dashboard can now click "Connect Epic" or "Connect PCC" without seeing the "Not Configured" error

