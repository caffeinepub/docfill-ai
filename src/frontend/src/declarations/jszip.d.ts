// Type stub for jszip
declare module "jszip" {
  class JSZip {
    file(name: string, data: Uint8Array | string): this;
    generateAsync(opts: { type: "blob" | "arraybuffer" | "uint8array" }): Promise<Blob>;
  }
  export default JSZip;
}
