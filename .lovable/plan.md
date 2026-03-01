

# Add ACH Direct Deposit Collection Interface

## Overview
Add an in-app form to collect ACH bank account details (routing number, account number, account type) as an alternative to the Stripe Connect Express onboarding flow. This gives users a simpler, more direct way to set up bank withdrawals.

## Frontend Changes

### New Component: `src/components/provider/AchDetailsForm.tsx`
A form card component with:
- Routing number input (9 digits, validated)
- Account number input (masked/hidden by default with show/hide toggle)
- Account holder name input
- Account type selector (Checking / Savings)
- Submit button that calls the edge function
- Success state showing a "Connected" badge after saving

The form will use zod validation:
- Routing number: exactly 9 digits
- Account number: 4-17 digits
- Account holder name: required, max 100 chars

### Update: `src/pages/provider/FiatOfframp.tsx`
- Import and render `AchDetailsForm` as a third off-ramp option card alongside Virtual Card and Bank Transfer (Stripe Connect)
- Pass `entity` and a callback to refresh bank status after successful ACH save

## Backend Changes

### Update: `supabase/functions/stripe-connect/index.ts`
Add a new action `save-ach` that:
1. Validates the ACH input fields server-side
2. Creates a Stripe Connect Custom account (instead of Express) with the provided external bank account details using `stripe.accounts.create()` with `external_account` parameter
3. Stores/updates the record in `stripe_connect_accounts` table
4. Returns success status

Also update the `check-status` action to return whether the account has an external bank account attached.

## Security Considerations
- Account number is never stored in our database -- only sent to Stripe
- Server-side validation of all inputs in the edge function
- Wallet ownership verification (already in place) ensures only the account owner can add bank details

## UI Layout
The ACH form will appear as a third card in the off-ramp options grid, with a bank icon and "Direct Deposit (ACH)" title. The grid will shift to 3 columns on desktop.

