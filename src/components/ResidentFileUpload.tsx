import { useEffect, useState } from "react";
import { Upload, X, Loader2, FileText, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  path: string | null;
  onChange: (path: string | null) => void;
  accept: "image" | "pdf";
  label?: string;
  className?: string;
}

const BUCKET = "resident-documents";
const MAX_BYTES = 5 * 1024 * 1024;

export const ResidentFileUpload = ({ path, onChange, accept, label, className }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setSignedUrl(null);
      return;
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setSignedUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    if (accept === "image" && !file.type.startsWith("image/")) {
      toast.error("Tem de ser uma imagem");
      return;
    }
    if (accept === "pdf" && file.type !== "application/pdf") {
      toast.error("Tem de ser um PDF");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Não autenticado");

      const ext = file.name.split(".").pop() || (accept === "pdf" ? "pdf" : "jpg");
      const newPath = `${uid}/${accept}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(newPath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
      }
      onChange(newPath);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async () => {
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
    onChange(null);
  };

  const Icon = accept === "pdf" ? FileText : ImageIcon;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      {path ? (
        <div className="relative w-full max-w-xs rounded-lg overflow-hidden border border-border bg-muted">
          {accept === "image" && signedUrl ? (
            <img src={signedUrl} alt="" className="w-full h-32 object-cover" />
          ) : (
            <a
              href={signedUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-4 text-sm hover:bg-muted/70"
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="truncate">{path.split("/").pop()}</span>
            </a>
          )}
          <button
            type="button"
            onClick={removeFile}
            className="absolute top-1 right-1 bg-foreground/80 text-background rounded-full p-1 hover:bg-foreground"
            aria-label="Remover"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex items-center justify-center gap-2 w-full max-w-xs h-24 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-smooth text-sm text-muted-foreground",
            uploading && "opacity-50 pointer-events-none",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Icon className="h-5 w-5" />
              <span>{accept === "pdf" ? "Carregar PDF" : "Carregar imagem"}</span>
            </>
          )}
          <input
            type="file"
            accept={accept === "pdf" ? "application/pdf" : "image/*"}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}
      <p className="text-[11px] text-muted-foreground">Máx. 5MB</p>
    </div>
  );
};

export default ResidentFileUpload;
