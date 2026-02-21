

## Complete Admin EHR Credentials Setup

### Problem
The "Not Configured" alerts on the EHR Integration page tell providers to ask their admin, but there is no admin screen to enter OAuth credentials. Currently, `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET`, `PCC_CLIENT_ID`, `PCC_CLIENT_SECRET` can only be set as backend secrets -- admins have no UI for this.

### What Will Change

**1. New database table: `ehr_credentials`**
Stores OAuth Client ID and Client Secret per organization and EHR type, with RLS so only the organization owner can manage their own credentials.

**2. New backend function: `manage-ehr-credentials`**
- POST: Save/update credentials (org owner only)
- GET: Check if credentials exist (returns configured true/false, never exposes secrets)

**3. Update `epic-auth` and `pointclickcare-auth` functions**
Before falling back to environment variables, look up credentials from `ehr_credentials` table for the provider's organization. This means both admin-entered credentials and platform-level secrets work.

**4. Admin Organizations page gets an "EHR Credentials" card**
Below the existing "Epic API connection" card:
- Two sections: Epic OAuth and PointClickCare OAuth
- Each has Client ID + Client Secret fields (secret masked)
- Save button per EHR type
- Green checkmark when saved
- Only editable by organization owners

**5. Provider-facing alerts updated**
Change "Admin needs to set up OAuth credentials" to direct providers to tell their admin to visit the Organization Management page.

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

-- RLS: org owners only
CREATE POLICY "Org owners can manage EHR credentials"
  ON public.ehr_credentials FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.entities
      WHERE entity_type = 'organization'
      AND wallet_address = (
        SELECT wallet_address FROM public.entities
        WHERE id = organization_id
      )
    )
  );
```

**Edge function credential lookup (added to epic-auth/pointclickcare-auth):**
```typescript
// Before using env vars, check org-level credentials
const { data: providerEntity } = await supabase
  .from('entities')
  .select('organization_id')
  .eq('id', entityId)
  .single();

if (providerEntity?.organization_id) {
  const { data: creds } = await supabase
    .from('ehr_credentials')
    .select('client_id, client_secret')
    .eq('organization_id', providerEntity.organization_id)
    .eq('ehr_type', 'epic') // or 'pointclickcare'
    .maybeSingle();

  if (creds) {
    epicClientId = creds.client_id;
    epicClientSecret = creds.client_secret;
  }
}
```

**Files to create:**
- `supabase/functions/manage-ehr-credentials/index.ts`

**Files to modify:**
- `src/pages/admin/Organizations.tsx` -- Add EHR credentials card with masked inputs
- `supabase/functions/epic-auth/index.ts` -- Query ehr_credentials before env vars
- `supabase/functions/pointclickcare-auth/index.ts` -- Same
- `supabase/config.toml` -- Register manage-ehr-credentials function
- `src/components/provider/EhrConnectCard.tsx` -- Update toast message to mention admin page
- `src/pages/provider/EhrIntegration.tsx` -- Update alert text to reference Organization Management page

### User Experience
1. Organization admin goes to Organization Management page
2. Scrolls to "EHR Credentials" section
3. Enters Client ID and Client Secret for Epic and/or PointClickCare
4. Clicks Save -- credentials stored securely with RLS protection
5. Providers can now click "Connect Epic" or "Connect PCC" without the "Not Configured" error

