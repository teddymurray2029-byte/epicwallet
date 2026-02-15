

# Epic Magic Link Integration

## Overview
Transform the Epic Integration page from a manual credential entry form into a streamlined "magic link" experience. Instead of asking providers to manually enter Client IDs and webhook secrets, the page will feature a single "Connect to Epic" button that initiates an OAuth 2.0 authorization flow with Epic's FHIR server, automatically registers webhook subscriptions, and stores the resulting credentials.

## How It Works

1. **Provider clicks "Connect to Epic"** on the redesigned page
2. A backend function generates a unique authorization URL with a state token and redirects to Epic's OAuth authorize endpoint
3. After the provider logs into Epic and grants access, Epic redirects back to a callback URL
4. A backend function exchanges the authorization code for access/refresh tokens, stores them in `ehr_integrations`, and registers FHIR Subscription resources on Epic's server so our webhook receives notifications automatically
5. The page shows a "Connected" state with connection details and a disconnect option

## Changes

### 1. Database Migration
Add columns to `ehr_integrations` to store OAuth tokens and subscription state:
- `access_token` (text, encrypted at rest) -- Epic OAuth access token
- `refresh_token` (text) -- for token renewal
- `token_expires_at` (timestamptz) -- expiry tracking
- `subscription_id` (text) -- Epic FHIR Subscription resource ID
- `auth_state` (text) -- CSRF state token during OAuth flow

### 2. New Backend Function: `epic-auth`
Handles two flows:
- **GET `?action=authorize&entity_id=...`** -- Generates a random state token, stores it in `ehr_integrations.auth_state`, and returns the Epic OAuth authorization URL for the frontend to redirect to
- **GET `?code=...&state=...`** (callback) -- Validates the state token, exchanges the authorization code for tokens via Epic's token endpoint, stores credentials, registers a FHIR Subscription pointing to our `epic-webhook` URL, and redirects the user back to `/provider/epic?connected=true`

### 3. Redesigned Epic Integration Page (`EpicIntegration.tsx`)
Replace the manual form with a streamlined experience:
- **Not connected state**: Hero card with Epic logo, explanation text, and a prominent "Connect to Epic" magic link button. Supported events shown below.
- **Connected state**: Success card showing connection status, connected timestamp, active subscription indicator, and a "Disconnect" button.
- Remove manual Client ID / Webhook Secret / FHIR URL input fields entirely.
- On mount, check URL params for `?connected=true` to show a success toast.

### 4. Update `supabase/config.toml`
Add `[functions.epic-auth]` with `verify_jwt = false` since Epic's OAuth callback is an external redirect.

## Technical Details

### Epic OAuth Flow (in `epic-auth` function)
```
Provider clicks "Connect to Epic"
        |
        v
epic-auth?action=authorize&entity_id=xxx
        |
        v
Redirect to: https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
  ?response_type=code
  &client_id=<OUR_APP_CLIENT_ID>
  &redirect_uri=<SUPABASE_URL>/functions/v1/epic-auth
  &state=<random_token>
  &scope=system/*.read
        |
        v
Provider logs into Epic, grants access
        |
        v
Epic redirects to: epic-auth?code=ABC&state=<token>
        |
        v
Exchange code for tokens, store in DB
Register FHIR Subscription -> our epic-webhook URL
        |
        v
Redirect to /provider/epic?connected=true
```

### FHIR Subscription Registration
After obtaining tokens, the function POSTs a Subscription resource to Epic:
```json
{
  "resourceType": "Subscription",
  "status": "requested",
  "channel": {
    "type": "rest-hook",
    "endpoint": "<webhook_url>",
    "payload": "application/json"
  },
  "criteria": "Encounter?status=finished"
}
```

### Secrets Required
- `EPIC_CLIENT_ID` -- Our registered Epic App Orchard client ID
- `EPIC_CLIENT_SECRET` -- Corresponding secret for the token exchange

### Page UI States
- **Loading**: Spinner while checking integration status
- **Disconnected**: Large card with Epic branding, "Connect to Epic" button, and event list
- **Connecting**: Button shows loading spinner after click
- **Connected**: Green success state with subscription status, timestamp, and disconnect option

