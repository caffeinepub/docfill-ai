import { PDFDocument, PDFTextField } from "pdf-lib";

export interface PdfFillEntry {
  fieldName: string;
  value: string;
}

/**
 * Returns all AcroForm TextField names in the given PDF file.
 * Returns an empty array if the PDF has no form fields.
 */
export async function getPdfFieldNames(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields
      .filter((f) => f instanceof PDFTextField)
      .map((f) => f.getName());
  } catch {
    return [];
  }
}

/**
 * Loads a PDF, fills the specified AcroForm text fields, triggers a browser
 * download of the filled PDF, and returns the filled bytes.
 *
 * Returns null if the PDF has no fillable fields.
 */
export async function fillAndDownloadPdf(
  file: File,
  fillData: PdfFillEntry[],
  outputFilename: string,
): Promise<Uint8Array | null> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  if (fields.length === 0) {
    return null;
  }

  for (const entry of fillData) {
    try {
      const textField = form.getTextField(entry.fieldName);
      textField.setText(entry.value);
    } catch {
      // Field not found or not a text field — skip silently
    }
  }

  const filledBytes = await pdfDoc.save();

  // Trigger download
  const blob = new Blob([filledBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = outputFilename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Small delay before revoking so browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);

  return filledBytes;
}
