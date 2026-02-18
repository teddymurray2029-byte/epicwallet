

## Add PointClickCare as an EHR Integration (Alongside Epic)

### Overview
Generalize the current Epic-only integration into a multi-EHR system that supports both Epic and PointClickCare interchangeably. The database already has an `integration_type` column on `ehr_integrations`, so the schema is ready -- the changes are in the UI, routing, edge functions, and event mapping.

### What Changes

**1. Rename the page from "Epic Integration" to "EHR Integration"**
- The page at `/provider/epic` becomes `/provider/ehr` (keep `/provider/epic` as a redirect for existing magic links)
- Show a chooser: "Connect to Epic" or "Connect to PointClickCare"
- Once connected, show whichever EHR is active with its branding

**2. Create a new edge function: `pointclickcare-auth`**
- Mirrors `epic-auth` structure but targets PointClickCare's OAuth 2.0 endpoints
- PointClickCare uses standard OAuth 2.0 with endpoints at `https://connect.pointclickcare.com`
- Stores tokens in `ehr_integrations` with `integration_type = 'pointclickcare'`
- Returns `{ configured: false }` when `PCC_CLIENT_ID` / `PCC_CLIENT_SECRET` secrets are missing (same graceful pattern as Epic)

**3. Update the webhook to accept PointClickCare events**
- Add a PointClickCare event type mapping alongside the existing Epic mapping
- Detect the source system from a header or payload field and use the correct map
- Same reward distribution logic applies regardless of source EHR

**4. Update the frontend EHR Integration page**
- Show two connection cards side by side (or stacked): Epic and PointClickCare
- Each has its own connect/disconnect flow calling its respective auth function
- Query `ehr_integrations` for both `integration_type = 'epic'` and `integration_type = 'pointclickcare'`
- Magic link supports `?connect=epic` or `?connect=pcc`
- Supported events list is shared (same clinical documentation events)

**5. Update routing and sidebar**
- Change sidebar link from "Epic Integration" to "EHR Integration"
- Add route `/provider/ehr` and redirect `/provider/epic` to it

### Technical Details

**PointClickCare OAuth endpoints:**
```text
Authorization: https://connect.pointclickcare.com/auth/authorize
Token:         https://connect.pointclickcare.com/auth/token
FHIR Base:     https://fhir.pointclickcare.com/fhir
```

**PointClickCare event mapping (same internal types):**
```typescript
const PCC_EVENT_MAP: Record<string, string> = {
  'encounter.complete': 'encounter_note',
  'medication.reconciliation': 'medication_reconciliation',
  'discharge.summary': 'discharge_summary',
  'problem.update': 'problem_list_update',
  'order.verified': 'orders_verified',
  'preventive.care': 'preventive_care',
  'coding.finalized': 'coding_finalized',
  'intake.completed': 'intake_completed',
  'consent.signed': 'consent_signed',
  'followup.completed': 'follow_up_completed',
};
```

**New secrets needed (when admin configures):**
- `PCC_CLIENT_ID`
- `PCC_CLIENT_SECRET`

**Files to create:**
- `supabase/functions/pointclickcare-auth/index.ts` -- OAuth flow for PointClickCare

**Files to modify:**
- `src/pages/provider/EpicIntegration.tsx` -- Rename and generalize to support both EHRs
- `src/App.tsx` -- Add `/provider/ehr` route, redirect `/provider/epic`
- `src/components/layout/AppSidebar.tsx` -- Update sidebar label/link
- `supabase/functions/epic-webhook/index.ts` -- Accept events from both sources
- `supabase/config.toml` -- Add `pointclickcare-auth` function config

**No database migration needed** -- `ehr_integrations.integration_type` already supports arbitrary string values.

### User Experience
- Providers see a single "EHR Integration" page with cards for each supported system
- Each card shows connection status independently
- Both can be connected simultaneously if a provider uses multiple systems
- The reward flow is identical regardless of which EHR sends the event
