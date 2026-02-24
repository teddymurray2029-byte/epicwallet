

## Improve CareCoin: Fix Remaining Issues and Polish

After a thorough audit, here are the remaining issues and improvements to make the app production-ready.

---

### 1. Broken Invite Accept Route

**Problem:** Invite links are generated as `/invites/accept?token=abc123`, but `App.tsx` only defines `/invite/:token` -- there is no `/invites/accept` route. Every invite link currently 404s.

**Fix:** Add a route for `/invites/accept` in App.tsx pointing to AcceptInvite, and keep the old `/invite/:token` route for backward compatibility.

---

### 2. Dead Sidebar Links (Admin Nav)

**Problem:** The admin sidebar lists "Policies" (`/admin/policies`), "Oracle Keys" (`/admin/oracles`), "Monitoring" (`/admin/monitoring`), and "Settings" (`/admin/settings`) -- none of these routes exist. They all 404.

**Fix:** Remove the dead links from `AppSidebar.tsx` admin nav. Only keep "Dashboard", "Organizations", and "Deploy Contract" which have actual pages.

---

### 3. Orphaned EpicIntegration Page

**Problem:** `src/pages/provider/EpicIntegration.tsx` is a standalone Epic-only integration page that duplicates `EhrIntegration.tsx`. It's still imported in App.tsx but only used as a redirect target (`/provider/epic` -> `/provider/ehr`). The file is dead code.

**Fix:** Delete `EpicIntegration.tsx`. The redirect in App.tsx already handles `/provider/epic` -> `/provider/ehr`.

---

### 4. Epic Auth Error Redirects Still Point to `/provider/epic`

**Problem:** In `epic-auth/index.ts`, error redirects on lines 154, 197, 251 still go to `/provider/epic?error=...`. This redirects to `/provider/ehr` via the alias but loses the `?error=` query parameter in the process.

**Fix:** Change all error redirects in `epic-auth/index.ts` from `/provider/epic?error=...` to `/provider/ehr?error=...`.

---

### 5. Missing `/invites/accept` Route in App.tsx

**Problem:** The invite link format uses `/invites/accept?token=...` but the route definition is `/invite/:token`.

**Fix:** Add a proper route: `<Route path="/invites/accept" element={<AcceptInvite />} />`.

---

### 6. Mobile Responsiveness Polish

**Problem:** Several pages have layout issues on small screens:
- Organization Management: grid layout doesn't stack cleanly
- EHR credential forms: inputs get cramped on mobile
- Provider Dashboard feature highlights: 3-column grid doesn't collapse

**Fix:** Adjust grid breakpoints (e.g., `grid-cols-1 sm:grid-cols-3` instead of `grid-cols-3`) for better mobile stacking.

---

### 7. Loading State Consistency

**Problem:** Some pages show plain text "Loading..." while others use the Loader2 spinner. Inconsistent UX.

**Fix:** Standardize all loading states to use the animated spinner pattern already established on most pages.

---

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/App.tsx` | Add `/invites/accept` route |
| 2 | `src/components/layout/AppSidebar.tsx` | Remove dead admin nav links (Policies, Oracle Keys, Monitoring, Settings) |
| 3 | `src/pages/provider/EpicIntegration.tsx` | Delete orphaned file |
| 4 | `supabase/functions/epic-auth/index.ts` | Fix error redirects from `/provider/epic` to `/provider/ehr` |
| 5 | `src/pages/provider/ProviderDashboard.tsx` | Fix 3-col feature grid to collapse on mobile |
| 6 | `src/pages/organization/OrganizationInvites.tsx` | Standardize loading states to use Loader2 spinner |

### Implementation Order

1. Fix the invite route (most critical -- invite links are fully broken)
2. Remove dead sidebar links (prevents user confusion)
3. Delete orphaned EpicIntegration page
4. Fix Epic error redirects
5. Polish mobile responsiveness and loading states

