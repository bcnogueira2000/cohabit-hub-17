// Leitura fiável do QR code fiscal das faturas, feita no browser:
// imagens são descodificadas diretamente; PDFs são renderizados página a página.
import jsQR from "jsqr";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { findQrText } from "../../supabase/functions/_shared/ptQr";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const scanCanvas = (canvas: HTMLCanvasElement): string | null => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
  return findQrText(hit?.data ?? null);
};

const scanImage = async (file: File): Promise<string | null> => {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  return scanCanvas(canvas);
};

const scanPdf = async (file: File): Promise<string | null> => {
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  try {
    for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
      const found = scanCanvas(canvas);
      if (found) return found;
    }
    return null;
  } finally {
    await doc.destroy();
  }
};

/** Devolve o texto do QR fiscal da fatura, ou null se não for encontrado. */
export const extractInvoiceQrText = async (file: File): Promise<string | null> => {
  try {
    if (file.type === "application/pdf") return await scanPdf(file);
    return await scanImage(file);
  } catch {
    return null;
  }
};
