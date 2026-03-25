/**
 * labelValidator.ts
 * Type-based validation for PDF field ↔ profile value mappings.
 */

export type FieldType =
  | "name"
  | "ssn"
  | "street"
  | "dob"
  | "phone"
  | "email"
  | "zip"
  | "generic";

export interface MismatchWarning {
  fieldLabel: string;
  profileKey: string;
  expectedType: FieldType;
  actualType: FieldType;
  value: string;
}

export function inferFieldType(profileKey: string): FieldType {
  const key = profileKey.toLowerCase();
  if (key === "name" || key.includes("name")) return "name";
  if (key === "idnumber" || key === "ssn") return "ssn";
  if (key === "dob" || key.includes("birth")) return "dob";
  if (key === "phone" || key.includes("phone")) return "phone";
  if (key === "email") return "email";
  if (key === "zip") return "zip";
  if (key === "street" || key.includes("street") || key.includes("address"))
    return "street";
  return "generic";
}

export function inferValueType(value: string): FieldType {
  const v = value.trim();
  if (/^\d{3}-\d{2}-\d{4}$/.test(v) || /^\d{9}$/.test(v)) return "ssn";
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}$/.test(v)
  )
    return "dob";
  if (
    /^[+][\d\s\-(). ]{6,16}$/.test(v) ||
    (/^[\d\s\-(). ]{7,17}$/.test(v) && v.replace(/\D/g, "").length >= 7)
  )
    return "phone";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
  if (/^\d{5}(-\d{4})?$/.test(v)) return "zip";
  if (/^[A-Za-z][A-Za-z\s\-'`.]{1,}$/.test(v)) return "name";
  if (/^\d+\s+[A-Za-z]/.test(v)) return "street";
  return "generic";
}

const MEANINGFUL_CONFLICTS: Partial<Record<FieldType, FieldType[]>> = {
  name: ["ssn", "phone", "dob", "zip"],
  ssn: ["name", "phone", "email", "street"],
  dob: ["phone", "ssn", "zip"],
  phone: ["name", "ssn", "email"],
  email: ["name", "ssn", "phone", "zip"],
  zip: ["name", "phone", "email", "ssn", "dob"],
};

export function validateFieldValue(
  fieldLabel: string,
  profileKey: string,
  value: string,
): MismatchWarning | null {
  if (!value.trim()) return null;
  const expectedType = inferFieldType(profileKey);
  const actualType = inferValueType(value);
  if (expectedType === actualType) return null;
  if (expectedType === "generic" || actualType === "generic") return null;
  const conflicts = MEANINGFUL_CONFLICTS[expectedType];
  if (!conflicts || !conflicts.includes(actualType)) return null;
  return { fieldLabel, profileKey, expectedType, actualType, value };
}
