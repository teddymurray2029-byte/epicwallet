
Goal: resolve the Epic connection failure (`invalid_client`) and prevent this error loop from happening again.

What I found from your current state:
1. The value you just sent (`ebe581f0-a247-495a-82a9-b5e8d29daae6`) is already stored as the Epic Client ID for your organization.
2. The currently stored Epic “secret” is also a UUID-like value (`85aac07b-...`), not a PEM private key.
3. The Epic backend function is therefore using `client_secret` flow (confirmed by logs), and Epic returns `invalid_client`.
4. The provider dashboard card only shows a generic error (`Epic token exchange failed`) and hides the backend hint, so the UI does not clearly tell you what to fix.
5. There is also an existing architectural mismatch: EHR screens use raw `fetch` while the app standard is backend-function invocation helpers, which contributes to inconsistent behavior/error handling.

Plan to fix (implementation sequence):

Phase 1 — Unblock and validate credentials correctly
1. Add Epic credential format validation in the Organization Management save flow:
   - If Epic secret does not look like PEM (`-----BEGIN ... PRIVATE KEY-----`), show a blocking validation message for Backend System setup.
   - Keep PointClickCare behavior unchanged.
2. Update Epic credential field UX:
   - Relabel from “Client Secret” to “Private Key (PEM)” for Epic.
   - Add inline helper text explaining:
     - Client ID is UUID-like.
     - Secret must be pasted as full PEM private key block.
3. Add “Validate Epic Credentials” behavior on save (or immediate post-save check) so admins know instantly whether credentials are usable before providers click Connect.

Phase 2 — Improve backend error signaling
4. Harden `epic-auth` error responses:
   - Return structured error metadata (error code + hint + next step).
   - Short-circuit with a clear message when Epic credential is obviously non-PEM in Backend System path (instead of generic 502 loop).
5. Preserve compatibility where possible:
   - Keep fallback support for non-PEM credential flow only if explicitly intended, but prioritize clear guidance for Backend System mode.

Phase 3 — Fix provider-facing error experience
6. Update both provider connect entry points to surface full backend hints:
   - `src/components/provider/EhrConnectCard.tsx` (currently drops hint/detail).
   - `src/pages/provider/EhrIntegration.tsx` (already partially supports hint; align message style).
7. Show actionable toast copy:
   - Example: “Epic requires a PEM private key on Organization Management.”
   - Include direct route guidance to `/admin/organizations`.

Phase 4 — Standardize backend function calls (stability)
8. Replace raw `fetch` calls for EHR functions with the project’s standard backend invoke pattern:
   - In Organization Management credential operations.
   - In provider Epic/PCC connect/disconnect operations.
9. This ensures consistent auth/header handling and better cross-origin reliability.

Technical notes:
- No database schema migration is required for this fix.
- Existing stored credentials remain compatible; only UI validation/messaging and backend response shape are adjusted.
- The client ID you provided is valid format-wise; the blocker is the Epic secret/key type.

Edge cases to handle:
- Admin pastes malformed PEM (missing headers/footers/newlines).
- Admin pastes a public key instead of private key.
- Legacy non-Backend-System Epic credential setups (if any) should receive explicit mode guidance instead of silent failure.

Verification plan:
1. Save Epic credentials on `/admin/organizations` with:
   - Client ID: UUID
   - Private key: full PEM block
2. Click Connect Epic from `/provider` dashboard card and confirm:
   - No generic 502 toast
   - Either success state or precise actionable hint
3. Repeat from `/provider/ehr` page and confirm identical behavior/messages.
4. Confirm `ehr_integration_status` reflects active Epic integration after successful connect.
5. Re-test on mobile viewport end-to-end (admin save → provider connect) to ensure no regression in small-screen UI.

Expected outcome:
- The `invalid_client` loop is prevented at input time (admin page) and clearly diagnosable at connect time (provider pages), with a successful connection path once proper PEM credentials are supplied.
