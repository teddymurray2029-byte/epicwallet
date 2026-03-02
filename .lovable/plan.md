

# Simplify Off-Ramp to Use Stripe's Own Hosted Flows

## Problem
The current off-ramp page has three options: Virtual Card, Bank Transfer (Stripe Connect Express), and a custom ACH form. The custom ACH form bypasses Stripe's hosted onboarding and creates Custom Connect accounts with manually entered bank details -- this is fragile and requires handling identity verification, TOS acceptance, and compliance manually.

## Solution
Remove the custom ACH Direct Deposit form and consolidate the off-ramp into two clean options that both use Stripe's own hosted experiences:

1. **Virtual Card** -- existing flow (navigate to /provider/card)
2. **Bank Transfer via Stripe Connect Express** -- uses Stripe's hosted onboarding to collect bank details, identity verification, and TOS acceptance automatically

## Changes

### 1. Remove `AchDetailsForm` from off-ramp page
- **File:** `src/pages/provider/FiatOfframp.tsx`
- Remove the import of `AchDetailsForm`
- Remove the ACH card from the grid
- Change grid from 3-column to 2-column layout (`md:grid-cols-2`)

### 2. Remove `save-ach` action from edge function
- **File:** `supabase/functions/stripe-connect/index.ts`
- Remove the entire `save-ach` case block (lines 220-299) since bank details will be collected through Stripe's hosted Express onboarding instead

### 3. Optionally delete `AchDetailsForm.tsx`
- **File:** `src/components/provider/AchDetailsForm.tsx`
- Delete this component since it's no longer used

## Result
The off-ramp page will have two cards side-by-side: Virtual Card and Bank Transfer. Bank account linking happens entirely through Stripe's own secure, compliant hosted onboarding flow -- no custom form needed.

