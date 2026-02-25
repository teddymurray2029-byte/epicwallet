

# Fix Virtual Card Creation (CORS Issue)

## Problem
The "Create Virtual Card" button fails with "Failed to fetch" because the edge function rejects requests from the current preview origin. The function has a hardcoded `ALLOWED_ORIGINS` list that doesn't include the Lovable project development origin (`*.lovableproject.com`).

## Root Cause
In `supabase/functions/virtual-card/index.ts`, the CORS origins are:
```
'https://carewallet.lovable.app'
'https://id-preview--63f64bab-d4cb-4037-bbce-9b1e2546fa52.lovable.app'
```
But requests come from `https://63f64bab-d4cb-4037-bbce-9b1e2546fa52.lovableproject.com` (development) and potentially other preview URLs. The browser blocks the response due to missing CORS headers.

## Fix

### 1. Update CORS in `supabase/functions/virtual-card/index.ts`
Replace the hardcoded origin list with a pattern-based check that accepts:
- The published URL (`carewallet.lovable.app`)
- Any Lovable preview/project URL matching the project ID

```typescript
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed =
    origin === 'https://carewallet.lovable.app' ||
    origin.includes('63f64bab-d4cb-4037-bbce-9b1e2546fa52');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://carewallet.lovable.app',
    'Access-Control-Allow-Headers': '...',  // keep existing
  };
}
```

### 2. Also fix the duplicate sidebar key warning
The sidebar merge logic creates two "Dashboard" entries with the same key. The deduplication compares by `url` but both provider and admin dashboards use `/provider` -- this is already handled, but the `key` prop in the JSX uses `item.title`, and both have "Dashboard". Add the `url` as the key instead to silence the React warning.

## Files Changed
| File | Change |
|------|--------|
| `supabase/functions/virtual-card/index.ts` | Replace hardcoded CORS origins with pattern match |
| `src/components/layout/AppSidebar.tsx` | Use `item.url` as React key instead of `item.title` |

No database or schema changes needed.

