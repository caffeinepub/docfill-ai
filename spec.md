# DocFill AI

## Current State

DocFill AI is a full-stack document automation platform with:
- React frontend with Glassmorphism/Bento UI (Slate Blue/White, Inter font)
- Motoko backend with authorization, blob-storage, and user profile management
- Sidebar navigation: Dashboard, Templates, Profile, Upload, Documents
- Semantic field mapping engine, coordinate-based PDF filling, dynamic field discovery
- Multi-category template library (US, Jamaica, Haiti)
- Public Form Library with .gov/.edu source fetching
- Missing Info Drawer, split-screen mapping view, exact label mapping
- No billing, subscription, or pay-as-you-go logic yet

## Requested Changes (Diff)

### Add
- **Marketplace Metadata file** (`marketplace.json`) with:
  - 16:9 preview image reference
  - Tagline: "The Intelligent Document Blueprint"
  - Key features: AI Field Extraction, Master Profile JSON, Public Form Library
  - Clone fee: $50
  - Sovereign Management metadata block (creator canister ID, optional update channel, update scope: security/engine only, cloner data isolation flag)
- **16:9 preview image** (`/assets/generated/marketplace-preview.dim_1280x720.png`)
- **Billing page** (`BillingPage.tsx`) as a new sidebar tab
  - Current plan display (Basic / Pro badge)
  - Payment method management (via Stripe)
  - Transaction history list
- **Stripe subscription tiers**:
  - Basic (Free): 2 document fills/month quota enforced in frontend state
  - Pro ($14.99/mo): unlimited fills, 5GB storage access, Sourced Public Forms unlocked
- **Pay-As-You-Go flow**: "Unlock & Download" button for $1.99 per filled PDF for non-Pro users
- **Download gating**: Download button activates only after Stripe payment success OR active Pro subscription verified
- **useBilling hook**: manages subscription status, fill quota, PAYG state, and Stripe checkout triggers
- **Subscription context**: provides plan tier to Upload, Documents, and Template Search pages

### Modify
- `AppLayout.tsx`: add "Billing" nav item with CreditCard icon
- `App.tsx`: add `billing` page type and render `BillingPage`
- `UploadPage.tsx`: gate the Download button behind billing check; show "Unlock & Download ($1.99)" for Basic users who have used quota
- `DashboardPage.tsx`: show plan badge and fill quota usage widget in the stats row

### Remove
- Nothing removed

## Implementation Plan

1. Generate 16:9 marketplace preview image
2. Write `marketplace.json` metadata file
3. Select `stripe` Caffeine component
4. Regenerate backend with Stripe subscription support, fill quota tracking per user, PAYG purchase recording
5. Add `BillingPage.tsx` with plan cards, payment method management, and transaction history
6. Add `useBilling.ts` hook encapsulating plan status, quota usage, and Stripe checkout calls
7. Update `AppLayout.tsx` to add Billing nav item
8. Update `App.tsx` to handle `billing` page
9. Gate download in `UploadPage.tsx` — show PAYG button or block behind Pro check
10. Add plan badge + quota widget to `DashboardPage.tsx`
