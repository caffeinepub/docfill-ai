# DocFill AI

## Current State
The app has a working PDF upload flow: drop PDF → 3s AI Extraction animation → Field Mapping Preview table → Review & Generate → filled download. Field matching uses a simple keyword lookup (`FIELD_KEYWORDS`) that normalizes the PDF field name and checks if it contains known substrings (e.g. "name", "email"). This works for machine-named fields like `fullname` or `email_address` but fails for human-readable labels like "Legal Name", "Representative", "Date of Birth (MM/DD/YYYY)", etc.

## Requested Changes (Diff)

### Add
- `src/utils/semanticMapping.ts` — a semantic field mapper that takes a raw PDF field label (or name) and returns the best matching Master Profile key using a comprehensive alias/synonym dictionary. Covers dozens of real-world label variants per profile key (e.g. "Legal Name", "Print Name", "Applicant Name", "Beneficiary Name" → `name`; "Mobile", "Cell Phone", "Contact Number" → `phone`; etc.).
- A `"Semantic Match"` vs `"Keyword Match"` badge in the Field Mapping Preview table so the user can see when the smarter mapper was responsible for the match.

### Modify
- `UploadPage.tsx` — replace `buildFillMapping` and `simulateDetection` logic with calls to the new semantic mapper. The detected fields in the preview table should now be derived from the actual PDF field names (using semantic mapping to find the profile key), not from the static `FIELD_DEFS` list. Add a `matchType: "semantic" | "keyword" | "none"` flag to `DetectedField` and render the appropriate badge in the Match column.
- The extraction step label "Profile Match" becomes "Semantic Mapping" to reflect the upgrade.

### Remove
- The old `FIELD_KEYWORDS` constant and the `simulateDetection` function (replaced by semantic mapping).

## Implementation Plan
1. Create `src/utils/semanticMapping.ts` with a comprehensive alias map (50+ aliases per key where relevant) and a `semanticMap(rawLabel: string): { key: string | null; matchType: "semantic" | "keyword" }` function.
2. Update `UploadPage.tsx`:
   - Import `semanticMap` from the new utility.
   - Change `DetectedField` to include `matchType: "semantic" | "keyword" | "none"`.
   - Replace `simulateDetection` with a function that iterates the real PDF field names, calls `semanticMap` for each, and builds the detected fields list (one row per PDF field, showing the raw label + matched profile value).
   - Update `buildFillMapping` to use the semantic mapper instead of `FIELD_KEYWORDS`.
   - Add a match type badge column to the Field Mapping Preview table (green "Semantic" pill or blue "Keyword" pill; grey "No Match" for unmatched).
   - Update extraction step label.
