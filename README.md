# EpicWallet (CareCoin)

EpicWallet is a React + Vite dashboard for managing CareCoin rewards, provider activity, and Epic EHR integrations. It blends a modern glassmorphism UI with wallet-based authentication and on-chain/off-chain reward tracking.

## Highlights

- **CareCoin dashboard** for providers, rewards, and activity insights.
- **Wallet-only authentication** via MetaMask or WalletConnect (wagmi + viem).
- **Supabase-backed rewards ledger** and Epic webhook processing.
- **Modern UI refresh** featuring gradients, glass surfaces, subtle borders, and elevated shadows across the layout and sidebar.
- **Epic Integration workflow** with generated webhook URLs for Epic App Orchard configuration.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (database + edge functions)
- wagmi + viem (wallet & chain integration)

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm
- A Supabase project (for webhook + rewards data)

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

Create a `.env` file in the project root with:

```sh
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

These are read in `src/integrations/supabase/client.ts`.

## Wallet Integration (MetaMask + WalletConnect)

Wallet connection is defined in `src/lib/wagmi.ts` and the UI lives in
`src/components/wallet/ConnectWalletButton.tsx`.

### How it works

- Uses wagmi `Injected` connector (MetaMask) with WalletConnect as fallback.
- Supports Polygon Mainnet and Polygon Amoy (testnet).
- The connect button prefers MetaMask when detected.

### Setup steps

1. Install MetaMask: https://metamask.io/download/
2. Run the app and click **Connect MetaMask**.
3. Approve the connection.
4. Switch to Polygon or Polygon Amoy if needed.

### Configuration tips

- Update RPCs, chains, or the WalletConnect Project ID in `src/lib/wagmi.ts`.
- Contract addresses are stored in `CONTRACT_ADDRESSES` and should be updated after deployment.

## Epic Integration

The Epic integration workflow is available on the **Epic Integration** page.

- Route: `/provider/epic`
- UI: `src/pages/provider/EpicIntegration.tsx`
- Webhook: `supabase/functions/epic-webhook`

### Prerequisites

- Supabase project with the required tables and `epic-webhook` edge function deployed.
- A provider entity in the `entities` table with a matching wallet address.
- `VITE_SUPABASE_URL` set so the UI can compute the webhook URL.

### Configure the integration

1. Connect your wallet in the app.
2. Open **Epic Integration** (`/provider/epic`).
3. Enter your **Epic Client ID** (required).
4. Optionally add **Webhook Secret** and **FHIR Base URL**.
5. Copy the **Webhook URL** for Epic App Orchard.

The webhook URL is:

```
${VITE_SUPABASE_URL}/functions/v1/epic-webhook
```

### Webhook payload expectations

`supabase/functions/epic-webhook/index.ts` expects JSON with:

- `eventType` (required)
- `providerWallet` (required; lowercase normalized)
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

## Reward Event Types

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
- The webhook uses the Supabase service role key at runtime; deploy the function with
  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured.

## UI & Design Enhancements

The dashboard now emphasizes CareCoin branding and usability with:

- Gradient backgrounds across the main app shell.
- Glass-like surfaces with `backdrop-blur` for header, content, and sidebar.
- Subtle borders and soft shadows for depth and clarity.
- Updated CareCoin branding badge in the sidebar header.

## Available Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run build:dev` — Development build
- `npm run lint` — Lint
- `npm run test` — Run tests (Vitest)
