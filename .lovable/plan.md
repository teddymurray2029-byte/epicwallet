
# Fix: Register Your Wallet in CareCoin

## The Problem
Your wallet connection works perfectly! The "Wallet Not Registered" message appears because the database doesn't have a record linking your wallet address to a provider role.

## Solution Options

### Option A: Add Self-Registration for Testing (Recommended for Development)
Add a "Register as Provider" button on the "Wallet Not Registered" screen that allows you to self-register during development/testing.

**Changes:**
1. Update the "Wallet Not Registered" card to include a registration button
2. When clicked, insert a new entity record with your wallet address as type "provider"
3. After registration, the dashboard will load automatically

**User experience flow:**
```text
Connect Wallet → "Wallet Not Registered" → Click "Register as Provider" → Dashboard loads
```

### Option B: Seed Sample Data via Database
Insert a test entity record directly with your wallet address. This is a one-time fix but doesn't help future users during testing.

---

## Recommended Implementation (Option A)

### Files to modify:

**1. `src/pages/provider/ProviderDashboard.tsx`**
- Add a "Register as Test Provider" button to the unregistered wallet state
- Include the wallet address display (currently empty in the code)
- Call Supabase to insert entity on button click
- Refresh entity state after registration

**2. `src/contexts/WalletContext.tsx`**
- Add a `registerEntity` function to create new entity records
- Include entity_type parameter for flexibility (provider/patient)

### Technical Details:
- Insert into `entities` table with:
  - `wallet_address`: Your connected address (lowercase)
  - `entity_type`: 'provider'
  - `display_name`: Optional or auto-generated
  - `is_verified`: false (for safety)
- RLS allows this because entities table has public SELECT policy
- Need to add INSERT policy for self-registration

### Database change:
Add an RLS policy to allow authenticated or anonymous users to insert their own entity record (for testing mode only), or use a Supabase Edge Function to handle registration securely.

---

## Summary
The fix adds a self-registration button so you can quickly register your wallet as a provider for testing. This is appropriate for development/Mock Mode but should be replaced with admin-controlled registration for production.
