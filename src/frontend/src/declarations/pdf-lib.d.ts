// Type stub for pdf-lib (loaded via package-lock)
declare module "pdf-lib" {
  export class PDFDocument {
    static load(
      pdf: ArrayBuffer | Uint8Array,
      opts?: { ignoreEncryption?: boolean },
    ): Promise<PDFDocument>;
    static create(): Promise<PDFDocument>;
    getForm(): PDFForm;
    getPage(index: number): PDFPage;
    getPageCount(): number;
    copyPages(src: PDFDocument, indices: number[]): Promise<PDFPage[]>;
    addPage(page?: PDFPage | number[]): PDFPage;
    save(): Promise<Uint8Array>;
    embedFont(font: StandardFonts): Promise<PDFFont>;
    embedFont(font: ArrayBuffer): Promise<PDFFont>;
  }
  export class PDFForm {
    getFields(): PDFField[];
    getTextField(name: string): PDFTextField;
    getFieldMaybe(name: string): PDFField | undefined;
  }
  export class PDFField {
    getName(): string;
  }
  export class PDFTextField extends PDFField {
    setText(text: string): void;
    setReadOnly(readOnly: boolean): void;
  }
  export class PDFPage {
    getSize(): { width: number; height: number };
    drawText(
      text: string,
      opts: {
        x: number;
        y: number;
        size?: number;
        font?: PDFFont;
        color?: RGB;
      },
    ): void;
  }
  export class PDFFont {}
  export interface RGB {
    type: string;
    red: number;
    green: number;
    blue: number;
  }
  export function rgb(r: number, g: number, b: number): RGB;
  export enum StandardFonts {
    Helvetica = "Helvetica",
    HelveticaBold = "Helvetica-Bold",
    TimesRoman = "Times-Roman",
  }
}
