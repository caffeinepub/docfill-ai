/**
 * publicFormFetch.ts
 *
 * Simulates fetching a public domain PDF from a .gov/.edu source.
 *
 * PRODUCTION NOTE: Due to browser CORS restrictions, direct fetching from
 * .gov/.edu domains is not possible from a browser. In production, this
 * should route through a backend proxy (e.g., a Motoko canister HTTP outcall
 * or a server-side proxy endpoint) that fetches the PDF and returns it.
 *
 * This simulation creates a minimal valid PDF using pdf-lib and returns it
 * as a Blob, mimicking what the backend proxy would return.
 */

import { PDFDocument, StandardFonts, rgb } from "@/lib/pdf-lib-stub";
import type { PublicForm } from "./publicFormLibrary";

export interface DetectedField {
  id: string;
  label: string;
  type: "text" | "date" | "checkbox" | "signature";
  confidence: number;
}

const CATEGORY_FIELDS: Record<string, DetectedField[]> = {
  Tax: [
    { id: "f1", label: "Full Legal Name", type: "text", confidence: 0.98 },
    {
      id: "f2",
      label: "Social Security Number",
      type: "text",
      confidence: 0.97,
    },
    { id: "f3", label: "Business Name", type: "text", confidence: 0.92 },
    { id: "f4", label: "Address", type: "text", confidence: 0.95 },
    { id: "f5", label: "City, State, ZIP", type: "text", confidence: 0.94 },
    { id: "f6", label: "Account Number", type: "text", confidence: 0.88 },
    {
      id: "f7",
      label: "Requester Name and Address",
      type: "text",
      confidence: 0.85,
    },
    { id: "f8", label: "Signature", type: "signature", confidence: 0.96 },
  ],
  Immigration: [
    { id: "f1", label: "Family Name", type: "text", confidence: 0.97 },
    { id: "f2", label: "Given Name", type: "text", confidence: 0.97 },
    { id: "f3", label: "Date of Birth", type: "date", confidence: 0.96 },
    { id: "f4", label: "Country of Birth", type: "text", confidence: 0.93 },
    { id: "f5", label: "A-Number", type: "text", confidence: 0.91 },
    {
      id: "f6",
      label: "Current Mailing Address",
      type: "text",
      confidence: 0.95,
    },
    { id: "f7", label: "Phone Number", type: "text", confidence: 0.9 },
    { id: "f8", label: "Email Address", type: "text", confidence: 0.88 },
  ],
  Employment: [
    { id: "f1", label: "Employee Last Name", type: "text", confidence: 0.98 },
    {
      id: "f2",
      label: "First Name and Middle Initial",
      type: "text",
      confidence: 0.97,
    },
    { id: "f3", label: "Address", type: "text", confidence: 0.95 },
    {
      id: "f4",
      label: "Social Security Number",
      type: "text",
      confidence: 0.96,
    },
    { id: "f5", label: "Employer EIN", type: "text", confidence: 0.89 },
    { id: "f6", label: "Date of Hire", type: "date", confidence: 0.87 },
    { id: "f7", label: "Job Title", type: "text", confidence: 0.92 },
  ],
  "Real Estate": [
    { id: "f1", label: "Tenant Full Name", type: "text", confidence: 0.97 },
    { id: "f2", label: "Property Address", type: "text", confidence: 0.96 },
    { id: "f3", label: "Monthly Rent", type: "text", confidence: 0.94 },
    { id: "f4", label: "Lease Start Date", type: "date", confidence: 0.95 },
    { id: "f5", label: "Lease End Date", type: "date", confidence: 0.95 },
    { id: "f6", label: "Security Deposit", type: "text", confidence: 0.91 },
    { id: "f7", label: "Landlord Name", type: "text", confidence: 0.93 },
    { id: "f8", label: "Phone Number", type: "text", confidence: 0.9 },
  ],
  "Social Security": [
    { id: "f1", label: "Full Name at Birth", type: "text", confidence: 0.97 },
    { id: "f2", label: "Full Name Now", type: "text", confidence: 0.97 },
    { id: "f3", label: "Date of Birth", type: "date", confidence: 0.96 },
    { id: "f4", label: "Place of Birth", type: "text", confidence: 0.93 },
    { id: "f5", label: "Mother's Maiden Name", type: "text", confidence: 0.89 },
    { id: "f6", label: "Mailing Address", type: "text", confidence: 0.94 },
    { id: "f7", label: "Phone Number", type: "text", confidence: 0.91 },
  ],
  Health: [
    { id: "f1", label: "Last Name", type: "text", confidence: 0.98 },
    { id: "f2", label: "First Name", type: "text", confidence: 0.98 },
    { id: "f3", label: "Date of Birth", type: "date", confidence: 0.97 },
    {
      id: "f4",
      label: "Medicare Claim Number",
      type: "text",
      confidence: 0.91,
    },
    { id: "f5", label: "Mailing Address", type: "text", confidence: 0.95 },
    { id: "f6", label: "Phone Number", type: "text", confidence: 0.92 },
    { id: "f7", label: "Signature", type: "signature", confidence: 0.96 },
    { id: "f8", label: "Date Signed", type: "date", confidence: 0.94 },
  ],
};

export async function fetchPublicForm(
  form: PublicForm,
): Promise<{ blob: Blob; fileName: string }> {
  // Simulate network latency
  await new Promise((resolve) =>
    setTimeout(resolve, 1200 + Math.random() * 800),
  );

  // Create a minimal valid PDF simulating the real form
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText(form.name, {
    x: 50,
    y: 730,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.5),
  });
  page.drawText(form.description, {
    x: 50,
    y: 705,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(`Source: ${form.domain} · Simulated for DocFill AI workspace`, {
    x: 50,
    y: 685,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Divider

  // Simulated form fields (visual)
  const fields = CATEGORY_FIELDS[form.category] || CATEGORY_FIELDS.Tax;
  let y = 645;
  for (const field of fields) {
    page.drawText(`${field.label}:`, {
      x: 50,
      y,
      size: 9,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 38;
    if (y < 100) break;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  return { blob, fileName: `${form.id}.pdf` };
}

export function simulateFieldScan(form: PublicForm): DetectedField[] {
  return CATEGORY_FIELDS[form.category] || CATEGORY_FIELDS.Tax;
}
