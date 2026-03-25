# DocFill AI

## Current State
The semantic mapping engine (`semanticMapping.ts`) maps PDF field labels to Master Profile keys via 3-pass alias matching. The `pdfFill.ts` fills AcroForm fields and coordinate overlays. The `fieldDiscovery.ts` diffs detected fields against the profile. The `DataMappingPanel.tsx` displays matched/discovered fields with inline edit inputs. No data-type validation exists — any profile value can be placed into any field regardless of the field label's semantic type.

## Requested Changes (Diff)

### Add
- `labelValidator.ts` utility: validates that a given profile value is compatible with the target field label/type. Defines rules:
  - `name` fields: must be alphabetic only (no digits or phone patterns)
  - `idNumber`/SSN fields: must match `XXX-XX-XXXX` or 9-digit number pattern
  - `street` fields: value must look like a street address (not a phone number or date)
  - `dob` fields: must match a date pattern
  - `phone` fields: must match a phone pattern
- Mismatch detection logic: when a profile value fails the type rule for the mapped field, generate a `MismatchWarning` object `{ fieldLabel, mappedProfileKey, detectedType, assignedValue, suggestedFix }`
- `MismatchPromptDialog.tsx`: a modal dialog shown when one or more mismatches are detected before fill. Shows each conflict clearly and lets the user:
  - "Keep Anyway" (proceed with the mismatched value)
  - "Leave Blank" (discard the value for this field)
  - "Edit" (user types a corrected value inline)
- Null handling: if a profile value has no corresponding field label on the form, it is silently discarded (already mostly working, but make it explicit and logged to console in dev)
- No Drift guarantee: validated by processing fields independently; a missing/discarded value does not shift adjacent fields

### Modify
- `fieldDiscovery.ts`: after mapping, run `validateFieldValue()` on each matched field. Return `MismatchWarning[]` alongside matched/discovered buckets.
- `DataMappingPanel.tsx`: display a warning icon on any field that has a pending mismatch conflict.
- `UploadPage.tsx`: before calling `fillAndDownloadPdf`, check for mismatches. If any exist, open `MismatchPromptDialog` and await resolution before proceeding with fill.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/utils/labelValidator.ts` with type rules and `validateFieldValue()` function.
2. Update `fieldDiscovery.ts` to run validation and return `MismatchWarning[]`.
3. Create `src/frontend/src/components/MismatchPromptDialog.tsx` modal.
4. Update `DataMappingPanel.tsx` to show warning icons on conflicted fields.
5. Update `UploadPage.tsx` to intercept the fill action, check for mismatches, show dialog, and resolve before downloading.
