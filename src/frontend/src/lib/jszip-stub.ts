// Stub implementation of JSZip for build compatibility
// Real ZIP functionality would require jszip to be added to package.json
class JSZip {
  private files: Record<string, Uint8Array | string> = {};

  file(name: string, data: Uint8Array | string): this {
    this.files[name] = data;
    return this;
  }

  async generateAsync(_opts: {
    type: "blob" | "arraybuffer" | "uint8array";
  }): Promise<Blob> {
    // Minimal stub: return a blob placeholder
    return new Blob(["ZIP stub - jszip not installed"], {
      type: "application/zip",
    });
  }
}

export default JSZip;
