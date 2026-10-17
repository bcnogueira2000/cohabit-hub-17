import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createResidentDocumentZip, residentZipName } from "@/lib/residentDocumentZip";

describe("resident document ZIP", () => {
  it("uses resident name and room, or just the name without a room", () => {
    expect(residentZipName("Maria Silva", "5EQ5")).toBe("Maria Silva – 5EQ5.zip");
    expect(residentZipName("Maria Silva")).toBe("Maria Silva.zip");
    expect(residentZipName("Maria/ Silva", "5:EQ5")).toBe("Maria_ Silva – 5_EQ5.zip");
  });
  it("keeps duplicate originals in their PT folder with numbered suffixes", async () => {
    const docs = Array.from({ length: 3 }, () => ({ fileName: "identificação.pdf" }));
    const { blob, included, failed } = await createResidentDocumentZip(docs, () => "Documento de identificação", async () => ({ arrayBuffer: async () => new TextEncoder().encode("pdf").buffer } as Blob));
    expect(included).toBe(3);
    expect(failed).toBe(0);
    expect(blob).not.toBeNull();
    if (!blob) throw new Error("Missing ZIP");
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Invalid ZIP"));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).filter((n) => !zip.files[n].dir)).toEqual([
      "Documento de identificação/identificação.pdf",
      "Documento de identificação/identificação (2).pdf",
      "Documento de identificação/identificação (3).pdf",
    ]);
  });
  it("counts failed files while retaining successful files", async () => {
    const result = await createResidentDocumentZip([{ fileName: "ok.pdf" }, { fileName: "failed.pdf" }], () => "Contrato assinado", async (doc) => {
      if (doc.fileName === "failed.pdf") throw new Error("Not available");
      return { arrayBuffer: async () => new TextEncoder().encode("pdf").buffer } as Blob;
    });
    expect(result.included).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.blob).not.toBeNull();
  });
  it("does not generate an empty ZIP if all files fail", async () => {
    const result = await createResidentDocumentZip([{ fileName: "failed.pdf" }], () => "Contrato assinado", async () => { throw new Error("Not available"); });
    expect(result).toEqual({ blob: null, included: 0, failed: 1 });
  });
});