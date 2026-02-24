

## Audit: Unfinished Items and Integration Fixes

After reviewing the full codebase, here is everything that needs to be finished or fixed to make the EHR integration flow smooth end-to-end.

---

### 1. Organizations page with EHR Credentials is unreachable

**Problem:** `src/pages/admin/Organizations.tsx` contains the EHR OAuth Credentials form, but it is never imported or routed in `App.tsx`. The route `/admin/organizations` currently renders `OrganizationInvites` instead. Admins cannot access the credentials form.

**Fix:** Either merge the EHR Credentials card into `OrganizationInvites.tsx` (since that is what `/admin/organizations` actually renders), or add a new route (e.g. `/admin/settings`) for `Organizations.tsx` and link to it from the sidebar.

The cleanest approach: move the EHR Credentials card into `OrganizationInvites.tsx` so admins see invite management AND credential setup on the same page. Delete the orphaned `Organizations.tsx`.

---

### 2. Provider "Not Configured" alert links to wrong page

**Problem:** In `EhrIntegration.tsx` (lines 307-308) and `EhrConnectCard.tsx` (line 63), the alert tells providers to go to the "Organization Management" page at `/admin/organizations`. But that page currently shows only invite management (see issue 1). Even once fixed, providers (non-org-owners) are blocked from viewing that page by the `isOrganization` check in `OrganizationInvites.tsx`.

**Fix:** After merging the credentials card (issue 1), the link will be correct. The alert text is fine as-is -- it says "Ask your organization admin", which is the intended behavior since only admins can see the page.

---

### 3. Sidebar has duplicate "Organizations" and "Invites" links for admins

**Problem:** The admin sidebar shows both "Organizations" (`/admin/organizations`) and "Invites" (`/organization/invites`), but `/organization/invites` has no route defined in `App.tsx` (it 404s). Meanwhile, `/admin/organizations` already shows invites.

**Fix:** Remove the dead "Invites" link from `adminNavItems` in `AppSidebar.tsx`, or route it properly.

---

### 4. `manage-ehr-credentials` edge function has no authorization

**Problem:** The edge function uses the service role key and accepts any `organization_id` parameter with no verification that the caller actually owns that organization. Anyone with the function URL can read credential status or overwrite credentials for any org.

**Fix:** Extract the caller's wallet from an auth header or require a signed message, then verify the caller's wallet matches the organization's `wallet_address` in the `entities` table before allowing reads or writes.

---

### 5. Epic callback redirects to `/provider/epic` but PCC redirects to `/provider/ehr`

**Problem:** In `epic-auth/index.ts`, the success redirect goes to `/provider/epic?connected=true`, which then redirects to `/provider/ehr` via a route alias. The PCC function correctly redirects to `/provider/ehr?connected=pcc`. The extra redirect for Epic is unnecessary and the `?connected=true` param doesn't match the EhrIntegration handler which checks for `connected=epic`.

**Fix:** Change the Epic auth success redirect from `/provider/epic?connected=true` to `/provider/ehr?connected=epic` so the toast message displays correctly.

---

### 6. EhrIntegration page checks `connected=true` but never `connected=epic`

**Problem:** In `EhrIntegration.tsx` line 69, the check is `searchParams.get('connected') === 'true'` which works by accident from the Epic redirect, but the toast says "Epic EHR connected" which is correct. However, the `connected=true` value is also checked with `=== 'epic'` via OR. If Epic were redirected with `connected=epic`, it would work better semantically.

**Fix:** Align the redirect value and the check. Epic auth should redirect with `?connected=epic`.

---

### 7. No delete/revoke for EHR credentials

**Problem:** Once an admin saves credentials, there is no way to delete or update them without entering new values. If credentials need to be revoked or rotated, the UI should support that.

**Fix:** Add a "Remove" or "Update" button next to the configured checkmark that calls a DELETE endpoint on `manage-ehr-credentials`.

---

### Summary of changes needed

| # | File(s) | Change |
|---|---------|--------|
| 1 | `OrganizationInvites.tsx`, `Organizations.tsx` | Move EHR Credentials card into OrganizationInvites; delete orphaned Organizations page |
| 2 | `EhrConnectCard.tsx`, `EhrIntegration.tsx` | Alert link is correct once issue 1 is resolved (no change needed) |
| 3 | `AppSidebar.tsx` | Remove dead "Invites" link from admin nav, or add proper route |
| 4 | `manage-ehr-credentials/index.ts` | Add caller authorization (verify wallet ownership of org) |
| 5 | `epic-auth/index.ts` | Change success redirect to `/provider/ehr?connected=epic` |
| 6 | `EhrIntegration.tsx` | Clean up callback param handling to accept `connected=epic` consistently |
| 7 | `manage-ehr-credentials/index.ts`, `OrganizationInvites.tsx` | Add DELETE support for credential removal and a UI button |

### Implementation order

1. Merge EHR Credentials card into OrganizationInvites (fixes issues 1 and 2)
2. Fix sidebar dead link (issue 3)
3. Fix Epic redirect URL (issues 5 and 6)
4. Add authorization to manage-ehr-credentials (issue 4)
5. Add credential delete support (issue 7)

