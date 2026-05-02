import { useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  paths: string[];
  onChange: (paths: string[]) => void;
  max?: number;
  className?: string;
}

const BUCKET = "request-photos";

export const RequestPhotoUpload = ({ paths, onChange, max = 3, className }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - paths.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${max} fotos.`);
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Não autenticado");

      const newPaths: string[] = [];
      const newPreviews: Record<string, string> = {};
      const list = Array.from(files).slice(0, remaining);

      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: não é imagem`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: máx 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) {
          toast.error(error.message);
          continue;
        }
        newPaths.push(path);
        newPreviews[path] = URL.createObjectURL(file);
      }

      if (newPaths.length) {
        onChange([...paths, ...newPaths]);
        setPreviews({ ...previews, ...newPreviews });
      }
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (path: string) => {
    await supabase.storage.from(BUCKET).remove([path]);
    onChange(paths.filter((p) => p !== path));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {paths.map((p) => (
          <div key={p} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={previews[p] || ""}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <button
              type="button"
              onClick={() => removePhoto(p)}
              className="absolute top-1 right-1 bg-foreground/80 text-background rounded-full p-0.5 hover:bg-foreground"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {paths.length < max && (
          <label
            className={cn(
              "w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-smooth",
              uploading && "opacity-50 pointer-events-none"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Até {max} fotos · 5MB cada
      </p>
    </div>
  );
};
