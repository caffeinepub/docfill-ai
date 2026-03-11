/**
 * fieldDiscovery.ts
 * Diffs detected PDF fields against the Master Profile to produce
 * matched (profile has a value) and discovered (no profile match) buckets.
 */
import { MASTER_PROFILE_LABELS, semanticMap } from "./semanticMapping";

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
 * Returns two buckets:
 *   matched   — fields where the profile has a non-empty value
 *   discovered — fields with no profile key OR empty profile value
 */
export function diffFieldsAgainstProfile(
  detectedFields: DetectedField[],
  profile: Record<string, string>,
): { matched: MappedField[]; discovered: MappedField[] } {
  const matched: MappedField[] = [];
  const discovered: MappedField[] = [];

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
    } else {
      discovered.push(mapped);
    }
  }

  return { matched, discovered };
}
