## Audit: Unfinished Items and Integration Fixes — COMPLETED

All 7 items have been implemented:

1. ✅ **Merged EHR Credentials into OrganizationInvites** — Credentials card now lives on `/admin/organizations` page. Deleted orphaned `Organizations.tsx`.
2. ✅ **Provider alerts** — Links are correct now that issue 1 is resolved.
3. ✅ **Removed dead "Invites" link** from admin sidebar nav.
4. ✅ **Added wallet authorization** to `manage-ehr-credentials` — verifies `wallet_address` matches the org owner.
5. ✅ **Fixed Epic redirect** — now goes to `/provider/ehr?connected=epic`.
6. ✅ **Cleaned up callback params** — `EhrIntegration.tsx` checks `connected=epic` consistently.
7. ✅ **Added DELETE support** — admins can remove EHR credentials via a trash button in the UI.
