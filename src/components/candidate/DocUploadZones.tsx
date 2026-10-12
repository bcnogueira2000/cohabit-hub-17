import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DOC_KIND_MAX_FILES, docKindLabel, type LeadDocKind } from "@/lib/leadDocuments";

type Lang = "pt" | "en";
export type FilesByKind = Partial<Record<LeadDocKind, File[]>>;

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["pdf", "jpg", "jpeg"];

const T = {
  pt: {
    choose: "Arrasta ou clica para escolher (PDF, JPG)",
    replace: "Substituir",
    add: "Adicionar verso",
    uploaded: "Carregado",
    pending: "Por carregar",
    idHint: "Até 2 ficheiros: frente e verso.",
    tooLarge: "O ficheiro {name} ultrapassa o limite de 10 MB.",
    remove: "Remover",
    missing: "Falta este documento.",
  },
  en: {
    choose: "Drag or click to choose (PDF, JPG)",
    replace: "Replace",
    add: "Add back side",
    uploaded: "Uploaded",
    pending: "Not uploaded",
    idHint: "Up to 2 files: front and back.",
    tooLarge: "The file {name} exceeds the 10 MB limit.",
    remove: "Remove",
    missing: "This document is missing.",
  },
};

const formatSize = (b: number) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const Zone = ({
  kind, lang, profile, files, onChange, showMissing,
}: {
  kind: LeadDocKind; lang: Lang; profile: string | null; files: File[];
  onChange: (f: File[]) => void; showMissing: boolean;
}) => {
  const t = T[lang];
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"replace" | "add">("replace");
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const max = DOC_KIND_MAX_FILES[kind];

  const take = (list: FileList | null) => {
    if (!list) return;
    const picked: File[] = [];
    let big: string | null = null;
    for (const f of Array.from(list)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED.includes(ext)) continue;
      if (f.size > MAX_FILE_BYTES) { big ??= f.name; continue; }
      picked.push(f);
    }
    setErr(big ? t.tooLarge.replace("{name}", big) : null);
    if (!picked.length) return;
    const next = mode === "add" ? [...files, ...picked] : picked;
    onChange(next.slice(0, max));
  };

  const open = (m: "replace" | "add") => { setMode(m); setTimeout(() => input.current?.click(), 0); };
  const done = files.length > 0;

  return (
    <div className="field" style={{ marginBottom: 18 }}>
      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span>{docKindLabel(kind, profile, lang)} <span className="req">*</span></span>
        <span style={{ fontSize: 12, fontWeight: 600, color: done ? "var(--sage-dark, #4f7a5a)" : "var(--muted, #8a8a8a)" }}>
          {done ? `✓ ${t.uploaded}` : t.pending}
        </span>
      </label>
      {!done ? (
        <div
          className={`dropzone${drag ? " dragover" : ""}`}
          tabIndex={0}
          role="button"
          style={{ padding: "18px 16px" }}
          onClick={() => open("replace")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open("replace"); } }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); setMode("replace"); take(e.dataTransfer?.files ?? null); }}
        >
          <p className="dropzone-text">{t.choose}</p>
          {kind === "id_document" && <p className="dropzone-hint">{t.idHint}</p>}
        </div>
      ) : (
        <ul className="file-list">
          {files.map((f, i) => (
            <li className="file-item" key={`${f.name}-${i}`}>
              <span className="file-name">{f.name}</span>
              <span className="file-size">{formatSize(f.size)}</span>
              <button type="button" aria-label={t.remove} onClick={() => onChange(files.filter((_, x) => x !== i))}>×</button>
            </li>
          ))}
          <li style={{ display: "flex", gap: 12, listStyle: "none", paddingTop: 4 }}>
            <button type="button" className="link-btn" onClick={() => open("replace")} style={{ textDecoration: "underline", fontSize: 13 }}>{t.replace}</button>
            {files.length < max && (
              <button type="button" className="link-btn" onClick={() => open("add")} style={{ textDecoration: "underline", fontSize: 13 }}>{t.add}</button>
            )}
          </li>
        </ul>
      )}
      <input
        ref={input}
        type="file"
        hidden
        multiple={max > 1}
        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
        onChange={(e) => { take(e.target.files); e.target.value = ""; }}
      />
      <p className={`field-error${err ? " show" : ""}`}>{err}</p>
      <p className={`field-error${showMissing && !done ? " show" : ""}`}>{t.missing}</p>
    </div>
  );
};

export const DocUploadZones = ({
  kinds, lang, profile, value, onChange, showMissing,
}: {
  kinds: LeadDocKind[]; lang: Lang; profile: string | null; value: FilesByKind;
  onChange: (v: FilesByKind) => void; showMissing: boolean;
}) => (
  <div>
    {kinds.map((k) => (
      <Zone key={k} kind={k} lang={lang} profile={profile} files={value[k] ?? []} showMissing={showMissing}
        onChange={(f) => onChange({ ...value, [k]: f })} />
    ))}
  </div>
);

const fnError = async (error: unknown) => {
  const res = (error as { context?: Response })?.context;
  if (res) {
    const body = (await res.clone().json().catch(() => null)) as { error?: string } | null;
    if (body?.error) return body.error;
  }
  return error instanceof Error ? error.message : "Erro inesperado";
};

/** Envia todos os ficheiros por URL assinada e regista-os com o respetivo tipo. */
export const uploadDocsByKind = async (token: string, value: FilesByKind, lang: Lang) => {
  for (const [kind, files] of Object.entries(value) as [LeadDocKind, File[]][]) {
    for (const file of files ?? []) {
      const fileType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
      const { data: up, error: e1 } = await supabase.functions.invoke("create-lead-document-upload", {
        body: { token, file_name: file.name, file_type: fileType },
      });
      if (e1) throw new Error(await fnError(e1));
      if (!up?.path || !up?.upload_token)
        throw new Error(lang === "pt" ? "Não foi possível preparar o envio." : "Could not prepare the upload.");
      const { error: e2 } = await supabase.storage
        .from("lead-documents")
        .uploadToSignedUrl(up.path, up.upload_token, file, { contentType: fileType });
      if (e2) throw new Error(e2.message);
      const { error: e3 } = await supabase.functions.invoke("register-lead-document-upload", {
        body: { token, file_name: file.name, file_type: fileType, storage_path: up.path, kind },
      });
      if (e3) throw new Error(await fnError(e3));
    }
  }
};
