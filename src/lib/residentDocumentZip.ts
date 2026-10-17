import JSZip from "jszip";

export const cleanFileName = (value: string, fallback = "documento") =>
  value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim() || fallback;

export const residentZipName = (name?: string, room?: string) =>
  `${cleanFileName([name?.trim() || "Residente", room?.trim()].filter(Boolean).join(" – "))}.zip`;

export async function createResidentDocumentZip<T extends { fileName: string }>(
  docs: T[],
  folderName: (doc: T) => string,
  load: (doc: T) => Promise<Blob>,
) {
  const zip = new JSZip();
  const used = new Set<string>();
  let failed = 0;
  let included = 0;
  for (const doc of docs) {
    try {
      const bytes = await (await load(doc)).arrayBuffer();
      const folder = cleanFileName(folderName(doc));
      const original = cleanFileName(doc.fileName);
      const dot = original.lastIndexOf(".");
      const stem = dot > 0 ? original.slice(0, dot) : original;
      const ext = dot > 0 ? original.slice(dot) : "";
      let name = original;
      let number = 2;
      while (used.has(`${folder}/${name}`.toLowerCase())) name = `${stem} (${number++})${ext}`;
      used.add(`${folder}/${name}`.toLowerCase());
      zip.file(`${folder}/${name}`, bytes);
      included++;
    } catch {
      failed++;
    }
  }
  return { blob: included ? await zip.generateAsync({ type: "blob", compression: "STORE" }) : null, included, failed };
}

export async function deliverResidentZip(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/zip" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}