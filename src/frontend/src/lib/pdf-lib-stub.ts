// Stub for pdf-lib — actual library should be installed via package manager
// This stub allows the app to build; at runtime, pdf-lib must be available.

export enum StandardFonts {
  Helvetica = "Helvetica",
  HelveticaBold = "Helvetica-Bold",
  TimesRoman = "Times-Roman",
  Courier = "Courier",
}

export function rgb(r: number, g: number, b: number) {
  return { r, g, b, type: "RGB" as const };
}

export class PDFTextField {
  setText(_text: string): void {}
  setFontSize(_size: number): void {}
  acroField = { dict: new Map() };
}

export class PDFField {
  getName(): string {
    return "";
  }
}

export class PDFPage {
  getSize(): { width: number; height: number } {
    return { width: 612, height: 792 };
  }
  drawText(_text: string, _opts?: Record<string, unknown>): void {}
}

export class PDFFont {
  widthOfTextAtSize(_text: string, _size: number): number {
    return 0;
  }
}

export class PDFForm {
  getFields(): PDFField[] {
    return [];
  }
  getTextField(_name: string): PDFTextField {
    return new PDFTextField();
  }
}

export class PDFDocument {
  static async load(
    _pdf: ArrayBuffer | Uint8Array,
    _opts?: { ignoreEncryption?: boolean },
  ): Promise<PDFDocument> {
    return new PDFDocument();
  }

  static async create(): Promise<PDFDocument> {
    return new PDFDocument();
  }

  getForm(): PDFForm {
    return new PDFForm();
  }
  getPage(_index: number): PDFPage {
    return new PDFPage();
  }
  getPageCount(): number {
    return 1;
  }
  async copyPages(_src: PDFDocument, _indices: number[]): Promise<PDFPage[]> {
    return [];
  }
  addPage(_page?: PDFPage | number[]): PDFPage {
    return new PDFPage();
  }
  async save(): Promise<Uint8Array> {
    return new Uint8Array();
  }
  async embedFont(_font: StandardFonts | ArrayBuffer): Promise<PDFFont> {
    return new PDFFont();
  }
  setTitle(_title: string): void {}
}
