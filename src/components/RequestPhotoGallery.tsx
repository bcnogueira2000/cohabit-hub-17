import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  paths: string[];
}

const BUCKET = "request-photos";

export const RequestPhotoGallery = ({ paths }: Props) => {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const p of paths) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 60 * 60);
        if (data?.signedUrl) out[p] = data.signedUrl;
      }
      if (!cancelled) setUrls(out);
    })();
    return () => { cancelled = true; };
  }, [paths.join("|")]);

  if (!paths || paths.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => urls[p] && setOpen(urls[p])}
            className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted hover:opacity-80 transition-smooth"
          >
            {urls[p] ? (
              <img src={urls[p]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full animate-pulse bg-muted" />
            )}
          </button>
        ))}
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <img src={open} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
};
