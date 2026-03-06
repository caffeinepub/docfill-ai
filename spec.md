# DocFill AI v6.5 — Caribbean Expansion

## Current State
DocFill AI v5.0 is a full-stack PDF auto-fill app with:
- Bento Box dashboard (profile completeness, stats, recent docs, quick upload)
- Master Profile page with 11 fields: name, email, phone, street/city/state/zip, dob, idNumber, employer, jobTitle. Stored partly in backend (name/email) and partly in localStorage via `docfill_profile_extra`.
- Upload Portal with 3-pass semantic mapping engine (`semanticMapping.ts`), coordinate-based filling for flat PDFs (`coordinateDetector.ts`), editable overrides table, Review & Generate step, and pdf-lib for AcroForm + coordinate filling.
- Privacy Mode toggle.
- Internet Identity auth.
- No Templates page exists yet.

The v6.0 spec (Templates, N-400 logic, Pro Tip, Batch Gen, Smart Detection) was planned but NOT yet implemented. v6.5 supersedes and merges both.

## Requested Changes (Diff)

### Add

**Templates Page (`TemplatesPage.tsx`)**
- New page accessible from sidebar nav ("Templates", BookOpen icon).
- Category tabs: "United States", "Jamaica", "Haiti".
- US category: N-400, N-600, G-1145 template cards.
- Jamaica category: Form N1 (Naturalization) and Form R1 (Marriage Registration).
- Haiti category: DS-2029 (Consular Report of Birth Abroad) and I-821 (Temporary Protected Status).
- Each card shows: form code, full name, category flag emoji, description, filing fee badge, and "Use Template" button.
- Multi-select checkboxes on US cards (N-400 + G-1145) for Batch Generation — "Generate Package" button downloads a ZIP with both filled PDFs.
- Pro Tip panel: when a naturalization/immigration template is selected (N-400, N1, DS-2029), show a dismissible aside with a link to the relevant government checklist.
- Fee Calculator card: when any template card is active/selected, show a sidebar or inline card with current filing fee details:
  - N-400: $725 USD
  - N-600: $1,170 USD
  - G-1145: Free
  - Jamaica Form N1: JMD ~$50,000
  - Jamaica Form R1: JMD ~$5,000
  - DS-2029: $100 USD
  - I-821: $50 USD (renewal) / $0 (initial)

**Referees Section in Master Profile**
- Add a new "Referees / Sponsors" card below Employment in `ProfilePage.tsx`.
- Two referee slots: Referee 1 and Referee 2, each with: Name, Relationship, Phone, and Address fields.
- Store referee data in localStorage under key `docfill_referees`.
- Map referee fields in semanticMapping to profile keys `referee1Name`, `referee1Phone`, `referee1Address`, `referee2Name`, `referee2Phone`, `referee2Address`.

**Caribbean Semantic Aliases**
- Add Jamaica Form N1 field aliases: "Sponsor Name", "Referee Name", "Referee Address", "Parish of Residence", "Nationality at Birth", "Country of Birth" → mapped to appropriate profile keys.
- Add Haiti / DS-2029 aliases: "Nom de famille" (French for surname → name), "Prénom" (given name → name), "Date de naissance" (DOB), "Lieu de naissance" (place of birth → city), "Adresse" (address → street), "Pays" (country), "Parrain/Marraine" (godparent/sponsor → referee1Name).

**Local Language Toggle in Review Step**
- In `UploadPage.tsx`, when the active template is a Haitian form (DS-2029 or I-821) OR any Haitian-detected form, add a toggle in the Review step header: "Show labels in: English | Français | Kreyòl".
- When French or Kreyòl is selected, swap the displayed field label text using a translation dictionary (the profile values stay in English; only the label column translates).
- Translation dictionary covers the main profile keys: name, email, phone, street, city, state, zip, dob, idNumber, employer, jobTitle, referee1Name, referee2Name.

**Photo Requirements Guide**
- In `UploadPage.tsx`, when a template with photo requirements is active (N-400, N1, DS-2029), show a "Photo Requirements" tooltip/info box near the dropzone or in the idle state.
- Content changes per country:
  - US (N-400): 2"×2" white background, recent, no glasses.
  - Jamaica (N1): 1"×1" matte finish, white background, taken within 6 months.
  - Haiti (DS-2029): 2"×2" white background, neutral expression, within 6 months.
- The info box links to the relevant agency photo guide page.

**Smart Form Detection (N-400)**
- In `UploadPage.tsx`, after field extraction, scan AcroForm field names + the uploaded filename for N-400 indicators ("n400", "n-400", "naturalization", "alien registration").
- If detected, show a dismissible amber banner: "This looks like an N-400. Apply N-400 Template Logic for best results?" with an "Apply" button that boosts N-400 alias priority in matching.

### Modify

**`semanticMapping.ts`**
- Add N-400 priority aliases at the TOP of relevant arrays: "alien registration number", "a-number", "a number", "uscis#" → idNumber; "current legal name", "family name", "given name", "middle name" → name; "physical address", "home address (number and street)" → street; "mailing address (if different)" → street (secondary); "current employer name", "name of employer" → employer; "current occupation" → jobTitle.
- Add referee/sponsor aliases: "sponsor name", "referee name", "referee 1 name", "referee 2 name", "name of referee", "name of sponsor" → referee1Name / referee2Name.
- Add Caribbean/French aliases as above.
- Add new profile keys to MASTER_PROFILE_LABELS and KEYWORD_MAP: referee1Name, referee1Phone, referee1Address, referee2Name, referee2Phone, referee2Address.

**`ProfilePage.tsx`**
- Add Referees / Sponsors section.
- Update completeness count from 11 to 17 fields (add 6 referee fields, but count them as optional — keep base 11 for core completion, referees are bonus).
- Update EXTRA_KEY data structure to include referee fields.
- Update handleClearAll and handleSave to include referee fields.

**`App.tsx`**
- Add "templates" to Page type.
- Import and render `TemplatesPage` in the switch statement, passing `onNavigate` and a new `activeTemplate` state.

**`AppLayout.tsx`**
- Add Templates nav item with BookOpen icon between Dashboard and Upload in `navItems`.

**`UploadPage.tsx`**
- Accept optional `templateId` prop (string | null) to pre-select a template context.
- Show Photo Requirements info box when templateId has photo requirements.
- Show language toggle in Review step when templateId is a Haitian form.
- Show Smart N-400 detection banner when applicable.
- Pass `getProfileData()` extended to include referee fields from localStorage.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `semanticMapping.ts` — add N-400, Caribbean, referee aliases; add new MASTER_PROFILE_LABELS keys; update KEYWORD_MAP.
2. Install `jszip` via npm for batch ZIP download.
3. Update `ProfilePage.tsx` — add Referees section with 2 referee slots (Name, Relationship, Phone, Address each); persist under `docfill_referees` key; include in save/clear logic; update completeness count display text.
4. Create `src/frontend/src/pages/TemplatesPage.tsx`:
   - Category tabs (US / Jamaica / Haiti) with flag emoji headers.
   - Template cards grid with checkboxes, fee badge, Use Template button, form description.
   - Pro Tip dismissible panel for naturalization templates linking to official checklists.
   - Fee Calculator inline card that shows when a template is selected/hovered.
   - Batch Generation: multi-select N-400 + G-1145, "Generate Package" button using JSZip + pdf-lib to produce a ZIP.
   - "Use Template" navigates to Upload page with that template pre-selected (via callback or state).
5. Update `App.tsx` — add "templates" page, pass `activeTemplate` state to UploadPage and TemplatesPage.
6. Update `AppLayout.tsx` — add Templates nav item.
7. Update `UploadPage.tsx`:
   - Accept `templateId?: string | null` prop.
   - Photo Requirements box shown in idle state when templateId is photo-enabled (N-400, N1, DS-2029).
   - Smart N-400 detection banner in "detected" stage.
   - Language toggle (EN / FR / Kreyòl) in review stage header when templateId is a Haitian form.
   - Extended `getProfileData()` reads referee fields from `docfill_referees`.
8. Validate (typecheck + lint + build) and fix any errors.
