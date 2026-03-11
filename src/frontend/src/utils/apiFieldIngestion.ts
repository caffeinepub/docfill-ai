/**
 * apiFieldIngestion.ts
 * Utility for parsing the JSON payload format that a Python backend
 * would send when it detects fields in a document.
 *
 * Python backend integration contract:
 *   POST /detect-fields
 *   Response: { fields: [{ label: string, type?: string, confidence?: number }] }
 */
import type { DetectedField } from "./fieldDiscovery";

export interface BackendFieldPayload {
  fields: Array<{
    label: string;
    type?: string;
    confidence?: number;
  }>;
}

/**
 * Parse a backend field detection response into the internal DetectedField format.
 * Filters out fields with confidence below 0.3 if confidence is provided.
 */
export function parseDetectedFieldsPayload(
  json: BackendFieldPayload,
): DetectedField[] {
  if (!json?.fields || !Array.isArray(json.fields)) return [];

  return json.fields
    .filter((f) => {
      if (f.confidence !== undefined && f.confidence < 0.3) return false;
      return typeof f.label === "string" && f.label.trim().length > 0;
    })
    .map((f) => ({
      label: f.label.trim(),
      type: f.type,
    }));
}
