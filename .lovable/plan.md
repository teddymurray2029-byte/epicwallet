

# Add a "How to Use CareWallet" Tutorial Page

## Overview
Create a dedicated `/tutorial` page that serves as a comprehensive, visually appealing guide for new and existing users. The page will walk users through every major feature of the CareWallet app with step-by-step instructions, illustrations using existing Lucide icons, and direct links to the relevant pages.

## Page Structure

The tutorial page will be a single scrollable page with these sections:

### 1. Hero Section
- Title: "Getting Started with CareWallet"
- Subtitle explaining the app's purpose (earn CARE tokens for clinical documentation)
- A "Quick Start" summary of the 4 key steps as icon cards

### 2. Step-by-Step Sections

**Step 1 -- Connect Your Wallet**
- What MetaMask / WalletConnect is
- How to install MetaMask (link)
- Click "Connect MetaMask" in the header
- Supported networks: Polygon, Polygon Amoy

**Step 2 -- Register as a Provider**
- After connecting, the dashboard prompts registration
- Choose an existing organization or create a new one
- Click "Register as Provider"

**Step 3 -- Join or Manage an Organization**
- Organization admins: create invite links, manage EHR credentials
- Providers: accept invite links to join
- Link to `/admin/organizations`

**Step 4 -- Connect Your EHR (Epic / PointClickCare)**
- Navigate to EHR Integration page
- Click "Connect" for your EHR system
- Authorize via OAuth flow
- Link to `/provider/ehr`

**Step 5 -- Earn and Track Rewards**
- Documentation events automatically earn CARE tokens
- View rewards breakdown on the Rewards page
- Monitor activity on the Activity page
- Links to `/provider/rewards` and `/provider/activity`

**Step 6 -- Virtual Visa Card**
- Create a virtual Visa card
- Convert CARE tokens to USD
- Spend anywhere Visa is accepted
- Link to `/provider/card`

**Step 7 -- Deploy CareCoin Contract (Admin)**
- For admins deploying the on-chain contract
- Link to `/admin/deploy`

### 3. FAQ / Tips Section
- "What if I lose access to my wallet?"
- "How are reward amounts determined?"
- "Is my data HIPAA-compliant?" (reference the HIPAA notice and 15-min timeout)

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/Tutorial.tsx` | Main tutorial page component |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/tutorial` route |
| `src/components/layout/AppSidebar.tsx` | Add "Tutorial" link to sidebar navigation (using `BookOpen` icon) |

### Implementation Notes
- Uses `DashboardLayout` for consistent navigation
- No authentication required -- accessible to all visitors
- Uses existing UI components: `Card`, `Badge`, `Button`, `Separator`
- Each section card has a numbered step badge, icon, description, and a "Go to page" link button
- Responsive grid layout: single column on mobile, two columns on larger screens for the FAQ
- Smooth scroll anchors so sidebar or internal links can jump to specific sections
- Re-uses the existing design language (gradients, glass cards, care-teal/care-green accents)
- No new dependencies needed

