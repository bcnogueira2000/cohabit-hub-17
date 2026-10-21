import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Pré-visualização do ficheiro da fatura: imagens mostram-se diretamente;
// PDFs são renderizados página a página (pdf.js), o que funciona também no telemóvel.
export const CostFilePreview = ({ fileUrl, fileType }: { fileUrl: string; fileType: string }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fileType !== "application/pdf") return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        if (typeof (Map.prototype as any).getOrInsertComputed !== "function") {
          (Map.prototype as any).getOrInsertComputed = function (key: unknown, cb: (k: unknown) => unknown) {
            if (this.has(key)) return this.get(key);
            const v = cb(key); this.set(key, v); return v;
          };
        }
        const task = pdfjsLib.getDocument({ url: fileUrl });
        const doc = await task.promise;
        const out: string[] = [];
        for (let p = 1; p <= Math.min(doc.numPages, 4); p++) {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport, canvas }).promise;
          out.push(canvas.toDataURL("image/jpeg", 0.85));
          if (cancelled) return;
          setPages([...out]);
        }
        await task.destroy();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUrl, fileType]);

  if (fileType !== "application/pdf")
    return <img src={fileUrl} alt="Fatura" className="w-full rounded-lg border border-border/60 object-contain" />;

  if (failed)
    return (
      <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        Abrir ficheiro noutra janela
      </a>
    );

  if (!pages.length)
    return (
      <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A abrir ficheiro…
      </div>
    );

  return (
    <div className="space-y-2">
      {pages.map((src, i) => (
        <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full rounded-lg border border-border/60" />
      ))}
    </div>
  );
};
