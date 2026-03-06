/**
 * Coordinate Detector — heuristic placement for flat/scanned PDFs with no AcroForm fields.
 *
 * Generates a list of CoordinateSlot objects representing where profile text
 * should be overlaid on the PDF page using pdf-lib's drawText API.
 */

import { MASTER_PROFILE_LABELS } from "./semanticMapping";

export interface CoordinateSlot {
  /** Friendly label, e.g. "Full Name" */
  label: string;
  /** Master Profile key, e.g. "name" */
  profileKey: string;
  /** The profile value to overlay */
  suggestedText: string;
  /** Points from the left edge of the page */
  x: number;
  /** Points from the bottom of the page (pdf-lib coordinate system) */
  y: number;
  /** 0-indexed page number */
  page: number;
  /** Font size in points */
  fontSize: number;
}

/**
 * Ordered list of profile keys to place on the document.
 * Keys without a profile value are skipped.
 */
const ORDERED_KEYS = [
  "name",
  "email",
  "phone",
  "dob",
  "idNumber",
  "street",
  "city",
  "state",
  "zip",
  "employer",
  "jobTitle",
] as const;

/**
 * Detect coordinate slots for a flat PDF page.
 *
 * @param profileData  - The current Master Profile key→value map
 * @param pageWidth    - Width of the first page in points
 * @param pageHeight   - Height of the first page in points
 * @returns An array of CoordinateSlot, one per non-empty profile value
 */
export function detectCoordinateSlots(
  profileData: Record<string, string | undefined>,
  pageWidth: number,
  pageHeight: number,
): CoordinateSlot[] {
  const slots: CoordinateSlot[] = [];

  // Start near the top of the page (82% up from bottom in pdf-lib coordinates)
  const startY = pageHeight * 0.82;
  // Place text to the right of where a printed label column would sit
  const x = pageWidth * 0.35;
  // Step down 38 points per field
  const stepY = 38;
  const fontSize = 11;

  let index = 0;
  for (const key of ORDERED_KEYS) {
    const value = profileData[key]?.trim();
    if (!value) continue;

    const label = MASTER_PROFILE_LABELS[key] ?? key;

    slots.push({
      label,
      profileKey: key,
      suggestedText: value,
      x,
      y: startY - index * stepY,
      page: 0,
      fontSize,
    });

    index++;
  }

  return slots;
}
