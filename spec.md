# DocFill AI

## Current State

DocFill AI has: dual-layer PDF filling (AcroForm + coordinate overlay), semantic mapping engine, AppLayout sidebar (Dashboard, Master Profile, Documents, Upload, Templates, API Settings, Billing, Appointments), dual-path notary checkout (RON $50 / Mobile $10+travel), availability guardrails (Mon-Fri 6-10PM ET, Sat-Sun 9AM-9PM ET), 2-hour lead time, 15-min buffer, Next Available countdown, MismatchPromptDialog, ManualEntryDialog, Stripe billing, Internet Identity auth. No Electronic Notary Journal exists. No admin/user role distinction.

## Requested Changes (Diff)

### Add
1. **NotaryJournalPage.tsx** - Admin-only page. Displays auto-logged post-session entries: Name, Date, Act Type (RON/Mobile Notary), ID Method (Driver's License/Passport/Credible Witness), Fee. Stored in localStorage key `docfill_journal_entries`. Read-only table with date/type filter. Glassmorphism bento style. Includes a lock button to exit admin mode.
2. **Admin PIN gate** - PIN `2024` unlocks admin mode stored as `docfill_admin_mode=true` in localStorage. PIN entry can be triggered from a hidden "Admin" link in the sidebar footer. Persists across sessions.
3. **Journal sidebar nav item** - BookOpen icon, only rendered when `localStorage.getItem('docfill_admin_mode') === 'true'`. Regular users never see it.
4. **Auto-journal trigger** - When AppointmentsPage confirms a booking (Stripe success state), push a journal entry object to localStorage.
5. **DateAmbiguityDialog.tsx** - Small dialog asking user to choose "Date of Birth" or "Today's Date" when the engine cannot classify a date label from proximity heuristics.

### Modify
1. **semanticMapping.ts** - Add `todayDate` key with aliases ("date of signature", "today's date", "date signed", "date of notarization", "execution date", "signing date"). Add `classifyDateLabel(label)` export returning `'dob' | 'today' | 'ambiguous'`.
2. **coordinateDetector.ts** - Add `OVERLAY_FONT` (Courier or Helvetica) and `OVERLAY_FONT_SIZE` (11pt default) constants. Set baseline offset to -2pt (place text 2pt above detected baseline).
3. **pdfFill.ts** - Use updated font/placement constants from coordinateDetector in the coordinate overlay path.
4. **AppointmentsPage.tsx** - Audit and confirm: correct ET hours, lead-time grayout, 15-min buffer, RON $50 flat, Mobile $10+travel, Next Available countdown, disclaimer text. Add auto-journal push on booking confirmation.

### Remove
- Nothing.

## Implementation Plan

1. Update semanticMapping.ts: todayDate key + classifyDateLabel().
2. Update coordinateDetector.ts: font/placement constants.
3. Update pdfFill.ts: wire constants.
4. Create NotaryJournalPage.tsx with PIN gate and read-only entry table.
5. Create DateAmbiguityDialog.tsx.
6. Update AppLayout.tsx: gated Journal nav item + admin PIN unlock in sidebar footer.
7. Update AppointmentsPage.tsx: audit guardrails, add auto-journal push.
8. Validate and build.
