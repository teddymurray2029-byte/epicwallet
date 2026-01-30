# EpicWallet (CareCoin)

EpicWallet is a React + Vite app for managing CareCoin rewards, provider activity, and EHR integrations. It connects wallets (MetaMask/WalletConnect), tracks off-chain rewards in Supabase, and records on-chain balances via wagmi.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (database + edge functions)
- wagmi + viem (wallet & chain integration)

## Getting Started

### Prerequisites
- Node.js 18+ (or 20+ recommended)
- npm

### Install & Run
```sh
npm install
npm run dev
```

### Build
```sh
npm run build
```

## Environment Variables

The frontend expects:

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key

These are read in `src/integrations/supabase/client.ts`.

## MetaMask (Wallet) Integration

Wallet connection is handled by wagmi in `src/lib/wagmi.ts` and the UI lives in `src/components/wallet/ConnectWalletButton.tsx`.

### How it works
- MetaMask uses the `Injected` connector (`wagmi/connectors`).
- WalletConnect is also enabled as a fallback.
- Supported chains: Polygon Mainnet and Polygon Amoy (testnet).
- The connect button prefers MetaMask if detected.

### Setup steps
1. Install MetaMask in your browser: https://metamask.io/download/
2. Open the app and click **Connect MetaMask**.
3. Approve the connection in MetaMask.
4. (Optional) Switch to Polygon or Polygon Amoy in MetaMask if needed.

### Configuration tips
- Update RPCs, chains, or the WalletConnect Project ID in `src/lib/wagmi.ts`.
- Contract addresses are placeholders in `CONTRACT_ADDRESSES` and should be updated after deployment.

## Epic Integration

The Epic integration is managed via the **Epic Integration** page:

- Route: `/provider/epic`
- UI: `src/pages/provider/EpicIntegration.tsx`
- Webhook (Supabase Edge Function): `supabase/functions/epic-webhook`

### Prerequisites
- A Supabase project with the required tables and the `epic-webhook` edge function deployed.
- A provider entity registered in the `entities` table with a matching wallet address.
- `VITE_SUPABASE_URL` set so the UI can compute the webhook URL.

### Configure the integration
1. Connect your wallet in the app.
2. Navigate to **Epic Integration** (`/provider/epic`).
3. Enter your **Epic Client ID** (required).
4. (Optional) Add **Webhook Secret** and **FHIR Base URL**.
5. Copy the **Webhook URL** and configure it in your Epic App Orchard settings.

The webhook URL is:

```
${VITE_SUPABASE_URL}/functions/v1/epic-webhook
```

### Webhook payload expectations

`supabase/functions/epic-webhook/index.ts` expects JSON with:

- `eventType` (required)
- `providerWallet` (required; lowercase is normalized)
- `timestamp` (optional; uses current time if missing)
- `patientId`, `organizationId`, `metadata` (optional)

Example payload:

```json
{
  "eventType": "encounter.complete",
  "timestamp": "2025-01-01T00:00:00Z",
  "providerWallet": "0x1234...abcd",
  "patientId": "patient-hash",
  "metadata": {
    "noteId": "abc123",
    "department": "Cardiology"
  }
}
```

## Authentication

CareCoin uses wallet-only authentication. Connect a Web3 wallet (e.g., MetaMask or WalletConnect) to access provider dashboards, rewards, and integrations—there are no email or password logins in the app.

## How can I deploy this project?

These map to internal documentation event types:

- `encounter.complete`
- `medication.reconciliation`
- `discharge.summary`
- `problem.update`
- `order.verified`
- `preventive.care`
- `coding.finalized`
- `intake.completed`
- `consent.signed`
- `followup.completed`

### Notes
- Reward processing uses Supabase tables like `documentation_events`, `reward_policies`, and `rewards_ledger`.
- The webhook uses the Supabase service role key at runtime; deploy the function with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured.

## Available Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run build:dev` — Development build
- `npm run lint` — Lint
- `npm run test` — Run tests (Vitest)
