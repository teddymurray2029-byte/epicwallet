

# CareCoin — Healthcare Rewards Platform on Polygon

A full-stack prototype for a Polygon-based ERC-20 healthcare rewards system with wallet-only authentication and a corporate/healthcare design aesthetic.

---

## Phase 1: Foundation & Authentication

### Wallet-Only Authentication System
- MetaMask and WalletConnect integration using wagmi/viem
- Wallet address becomes the user's identity
- Role detection: System identifies if connected wallet belongs to a Provider, Patient, Admin, or Organization based on Registry data
- Session persistence with automatic reconnection

### Database Architecture (Supabase)
- **entities** table: Maps wallet addresses to entity type (provider/patient/organization) with metadata
- **documentation_events** table: Off-chain record of healthcare events with timestamps, event types, and hashes
- **attestations** table: Signed attestations linking events to reward distributions
- **reward_policies** table: Configurable rules per event type (base reward, splits, rate limits)
- **oracle_keys** table: Allowlisted public keys for attestation verification
- **rewards_ledger** table: Complete audit trail of all reward distributions

---

## Phase 2: Provider Dashboard (Priority)

### Main Dashboard View
- **Wallet Status Card**: Connected address, CARE token balance (from blockchain), verification status
- **Rewards Summary**: Total earned (all-time, this month, this week)
- **Recent Activity Feed**: Latest documentation events and resulting rewards

### Rewards Breakdown
- **By Event Type**: Chart showing earnings per category (Encounter notes, Med reconciliation, Discharge summaries, etc.)
- **By Time Period**: Daily/weekly/monthly trends with interactive charts
- **Detailed Transaction History**: Filterable table with event hash, timestamp, amount, transaction hash

### Wallet Management
- View connected wallet address
- See pending vs confirmed rewards
- Export transaction history (CSV)

---

## Phase 3: Patient Portal

### Dashboard
- **My Rewards**: CARE token balance and earnings timeline
- **Visit History**: List of visits where rewards were earned (no PHI, just dates and reward amounts)
- **Participation Rewards**: Earned for completing intake forms, consent, follow-ups

### Payment Features
- **Pay Invoice**: Scan QR code or enter invoice ID to pay provider in CARE
- **Payment History**: All outgoing payments with dates and recipients
- **Balance Management**: View token balance, see transaction confirmations

### Proof & Transparency
- View event hashes corresponding to your rewards
- Verify on Polygon block explorer (link to Polygonscan)

---

## Phase 4: Admin Console

### Organization Management
- Onboard new healthcare organizations
- Register provider and patient wallets under organizations
- Set organization-level reward splits

### Policy Configuration
- **Event Types Manager**: Create/edit documentation event types
- **Reward Rules**: Set base reward amount per event type
- **Split Configuration**: Define percentage splits (provider/organization/patient)
- **Rate Limits**: Max rewards per provider/day, per event type, anti-gaming thresholds

### Oracle Key Management
- Add/revoke oracle public keys authorized to submit attestations
- View attestation submission history per oracle
- Emergency pause controls

### Monitoring & Audit
- Real-time fraud flags and anomaly alerts
- Complete audit log of all system actions
- Export capabilities for compliance

---

## Phase 5: Attestation Service (Edge Functions)

### Event Ingestion API
- POST endpoint to receive mock EHR events
- Validates required fields (event_type, provider_id, patient_id, timestamp)
- Stores full event record in Supabase (off-chain, no PHI on chain)

### Attestation Generation
- Generates event_hash from structured data (keccak256)
- Signs attestation with oracle key (stored securely in Supabase secrets)
- Prepares attestation payload for on-chain submission

### Validation Rules
- Duplicate detection (same event_hash cannot be rewarded twice)
- Rate limit checking per provider/day
- Timestamp validation (events must be within acceptable window)

---

## Phase 6: Blockchain Integration

### Contract Interface Preparation
- Define TypeScript interfaces matching your contract ABIs
- **CareCoin.sol interface**: balanceOf, transfer, approve, allowance
- **RewardEngine.sol interface**: submitAttestation, getPolicy, getRewardHistory
- **Registry.sol interface**: registerWallet, getEntityByWallet

### Wallet Integration
- wagmi hooks for reading token balances
- Transaction submission for payments
- Transaction status tracking and confirmation UI

### Mock Mode Toggle
- Admin setting to switch between:
  - **Mock Mode**: All rewards simulated in database only
  - **Live Mode**: Attestations submitted to actual Polygon contracts
- Allows full testing before contract deployment

---

## Phase 7: Contract-Ready Architecture

### Smart Contract Specification Document
- Complete Solidity interface definitions
- Constructor parameters and initialization requirements
- Event signatures for frontend listeners
- Deployment checklist

### Integration Points
- Environment variables for contract addresses
- ABI JSON files (placeholder structure for your deployed contracts)
- Network configuration (Polygon Mumbai testnet → Polygon mainnet)

---

## Design System

### Corporate/Healthcare Aesthetic
- Clean, professional color palette (medical blues, greens, neutral grays)
- Data-focused typography optimized for readability
- Enterprise-grade data tables with sorting, filtering, pagination
- Professional charting with Recharts (already installed)
- Status indicators and progress bars for reward tracking

### Responsive Layout
- Sidebar navigation for desktop
- Collapsible menu for tablet
- Bottom navigation for mobile
- Consistent card-based layouts across all views

---

## Security & Compliance Features

- Role-based access control (separate user_roles table)
- All PHI remains off-chain
- Event hashes provide audit trail without exposing data
- Rate limiting and anti-abuse measures
- Pausable system for emergency stops

