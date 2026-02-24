

# Fix: Organization Access, EHR Connection, and Virtual Card Errors

## Status: ✅ COMPLETED

All five fixes have been implemented and deployed.

## What was fixed

### 1. ✅ Database: Added organization/admin roles to entity
Updated metadata for wallet `0xf150...07ae` to include `roles: ["organization", "admin"]`.

### 2. ✅ WalletContext.tsx: Smart organization ownership detection
Added `isOrgOwner` state that queries for organizations where `metadata->>owner_wallet_address` matches the connected wallet. This means any wallet that creates an organization is automatically recognized as an org admin — no manual metadata patching needed.

### 3. ✅ EhrConnectCard.tsx: Fixed CORS errors
Added `apikey` header to `fetch()` calls so edge functions accept the request.

### 4. ✅ Virtual Card edge function: Fixed Stripe error fallback
- `stripeRequest` now includes the actual Stripe error body in thrown errors
- Broadened demo mode fallback to catch `[403]`, `[404]`, `capability`, and `not set up` patterns

### 5. ✅ OrganizationInvites.tsx: Fixed CORS on EHR credential management
Added `apikey` header to all `fetch()` calls to `manage-ehr-credentials` edge function.
