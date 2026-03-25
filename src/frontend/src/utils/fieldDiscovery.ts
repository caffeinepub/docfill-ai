import { type MismatchWarning, validateFieldValue } from "./labelValidator";
/**
 * fieldDiscovery.ts
 * Diffs detected PDF fields against the Master Profile to produce
 * matched (profile has a value) and discovered (no profile match) buckets.
 * v7.6: Also runs type validation and returns MismatchWarning[]
 */
import { MASTER_PROFILE_LABELS, semanticMap } from "./semanticMapping";

export type { MismatchWarning };

export interface ProfileField {
  key: string;
  label: string;
  value: string;
}

export interface DetectedField {
  label: string;
  type?: string;
}

export interface MappedField {
  /** Raw PDF field label */
  label: string;
  /** Matched Master Profile key, or null */
  profileKey: string | null;
  /** Friendly label from MASTER_PROFILE_LABELS */
  profileLabel: string | null;
  /** Value from the profile (empty string if none) */
  profileValue: string;
  /** How the match was determined */
  matchType: "exact" | "semantic" | "keyword" | "none";
}

/**
 * Compare detected PDF fields against a flat profile map.
 * Returns:
 *   matched    — fields where the profile has a non-empty value
 *   discovered — fields with no profile key OR empty profile value
 *   mismatches — fields whose value type conflicts with the expected type
 */
export function diffFieldsAgainstProfile(
  detectedFields: DetectedField[],
  profile: Record<string, string>,
): {
  matched: MappedField[];
  discovered: MappedField[];
  mismatches: MismatchWarning[];
} {
  const matched: MappedField[] = [];
  const discovered: MappedField[] = [];
  const mismatches: MismatchWarning[] = [];

  for (const field of detectedFields) {
    const result = semanticMap(field.label);
    const profileKey = result.key;
    const profileValue = profileKey !== null ? (profile[profileKey] ?? "") : "";
    const hasValue = profileValue.trim().length > 0;

    const mapped: MappedField = {
      label: field.label,
      profileKey,
      profileLabel:
        profileKey !== null
          ? (MASTER_PROFILE_LABELS[profileKey] ?? null)
          : null,
      profileValue,
      matchType:
        profileKey === null
          ? "none"
          : result.matchType === "semantic"
            ? "semantic"
            : "keyword",
    };

    if (hasValue) {
      matched.push(mapped);
      // Run type validation for matched fields
      if (profileKey !== null) {
        const warning = validateFieldValue(
          field.label,
          profileKey,
          profileValue,
        );
        if (warning) mismatches.push(warning);
      }
    } else {
      discovered.push(mapped);
    }
  }

  return { matched, discovered, mismatches };
}
