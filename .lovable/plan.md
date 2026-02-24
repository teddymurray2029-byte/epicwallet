

# Fix: Organization Access, EHR Connection, and Virtual Card Errors

## Problem Summary

Your wallet (`0xf150...07ae`) is registered as `entity_type: provider` with empty metadata (`{}`). You also own the organization "Teddy health" (it stores your wallet as `owner_wallet_address`). However, the app does not recognize you as an organization admin because it only checks for `entity_type === 'organization'` or `metadata.roles` containing `'organization'` -- neither is true for your entity.

This causes three cascading failures:
1. "Organization access required" on the Organization Management page
2. "Failed to connect to Epic/PCC" because EHR credentials were never configured (you couldn't access the admin page to set them)
3. "Failed to create card" due to a Stripe Issuing error that doesn't properly fall back to demo mode

---

## Changes

### 1. Database: Add organization/admin roles to your entity

Run a migration to update your entity's metadata so the existing role checks recognize you as an organization admin immediately.

```sql
UPDATE entities
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{roles}',
  '["organization","admin"]'
)
WHERE wallet_address = '0xf150af661f6c33150247756b07ddaab1e15f07ae';
```

### 2. WalletContext.tsx: Smarter organization ownership detection

Currently `isOrganization` only checks the entity's own type and metadata. We will add an additional check: query the `entities` table for any organization whose `metadata->>'owner_wallet_address'` matches the connected wallet. This way, any wallet that created an organization is automatically recognized as an org admin -- no manual metadata patching needed in the future.

Changes:
- Add `isOrgOwner` state variable
- Add a `useEffect` that queries for owned organizations when `address` changes
- Include `isOrgOwner` in the `isOrganization` and `isAdmin` checks

### 3. EhrConnectCard.tsx: Fix CORS errors on EHR connection

Replace raw `fetch()` calls with `supabase.functions.invoke()` which automatically handles authentication headers and bypasses browser CORS restrictions. This will fix the "Failed to connect to Epic" and "Failed to connect to PointClickCare" errors.

### 4. Virtual Card edge function: Fix Stripe error fallback

The `stripeRequest` function currently throws `"Stripe error [403]"` without including the actual error message. The catch block checks for the word "Issuing" in the error -- which never matches. Fix by including the Stripe error body in the thrown error message, and broadening the fallback pattern to also catch HTTP 403/404 responses.

### 5. OrganizationInvites.tsx: Fix CORS on EHR credential management

Same CORS issue as above -- raw `fetch()` calls to `manage-ehr-credentials` edge function. Switch to `supabase.functions.invoke()`.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| **New migration** | SQL to add `roles: ["organization","admin"]` to your entity |
| `src/contexts/WalletContext.tsx` | Add org ownership query + include in `isOrganization`/`isAdmin` |
| `src/components/provider/EhrConnectCard.tsx` | Replace `fetch()` with `supabase.functions.invoke()` |
| `src/pages/organization/OrganizationInvites.tsx` | Replace `fetch()` with `supabase.functions.invoke()` for EHR credential calls |
| `supabase/functions/virtual-card/index.ts` | Include Stripe error body in thrown error; broaden Issuing fallback check |

### WalletContext change detail

```typescript
// New state
const [isOrgOwner, setIsOrgOwner] = useState(false);

// New effect
useEffect(() => {
  if (!address) { setIsOrgOwner(false); return; }
  supabase
    .from('entities')
    .select('id')
    .eq('entity_type', 'organization')
    .eq('metadata->>owner_wallet_address', address.toLowerCase())
    .limit(1)
    .then(({ data }) => setIsOrgOwner(!!data?.length));
}, [address]);

// Updated role checks
isOrganization: isOrgOwner || entity?.entity_type === 'organization' || ...,
isAdmin: isOrgOwner || entity?.entity_type === 'admin' || ...,
```

### Virtual card stripeRequest fix

```typescript
if (!res.ok) {
  const errBody = data?.error?.message || JSON.stringify(data);
  throw new Error(`Stripe error [${res.status}]: ${errBody}`);
}
```

And broaden the catch:
```typescript
if (errMsg.includes('Issuing') || errMsg.includes('[403]') || errMsg.includes('[404]') || errMsg.includes('capability')) {
  return handleDemoMode(...);
}
```

