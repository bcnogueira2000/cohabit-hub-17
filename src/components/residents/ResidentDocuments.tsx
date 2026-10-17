import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Loader2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { docKindLabel } from "@/lib/leadDocuments";
import { createResidentDocumentZip, deliverResidentZip, residentZipName } from "@/lib/residentDocumentZip";

const MAX_BYTES = 10 * 1024 * 1024;
const STAFF_KINDS = ["signed_contract", "id_document", "iban_proof", "enrollment_or_work_proof", "other"] as const;
const ORDER = [...STAFF_KINDS];

const kindLabel = (k: string, profile: string | null) =>
  k === "signed_contract" ? "Contrato assinado" : docKindLabel(k, profile, "pt");

type Doc = {
  id: string;
  kind: string;
  fileName: string;
  path: string;
  bucket: "lead-documents" | "resident-documents";
  uploadedAt: string;
  origin: string;
};

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);

/** Documentos do residente: os da candidatura (lead) + os carregados pela equipa. Nunca se apagam. */
export const ResidentDocuments = ({
  residentId,
  profile,
  legacyPath,
  residentName,
  roomCode,
}: {
  residentId: string;
  profile: string | null;
  legacyPath?: string | null;
  residentName?: string;
  roomCode?: string;
}) => {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<string>("signed_contract");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<{ blob: Blob; filename: string } | null>(null);

  const { data: docs = [] } = useQuery({
    queryKey: ["resident-documents", residentId],
    queryFn: async (): Promise<Doc[]> => {
      const { data: cs } = await supabase.from("contracts").select("id, lead_id").eq("resident_id", residentId);
      const contractIds = (cs ?? []).map((c: any) => c.id);
      const leadIds = new Set((cs ?? []).map((c: any) => c.lead_id).filter(Boolean) as string[]);
      if (contractIds.length) {
        const { data: ls } = await supabase.from("leads").select("id").in("contract_id", contractIds);
        (ls ?? []).forEach((l: any) => leadIds.add(l.id));
      }
      const { data: st } = await supabase.from("stays").select("lead_id").eq("resident_id", residentId).not("lead_id", "is", null);
      (st ?? []).forEach((s: any) => leadIds.add(s.lead_id));

      const [{ data: ld }, { data: rd }] = await Promise.all([
        leadIds.size
          ? supabase.from("lead_documents").select("*").in("lead_id", [...leadIds])
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("resident_documents").select("*").eq("resident_id", residentId),
      ]);
      return [
        ...((ld ?? []) as any[]).map((d) => ({
          id: d.id, kind: d.kind ?? "other", fileName: d.file_name, path: d.storage_path,
          bucket: "lead-documents" as const, uploadedAt: d.uploaded_at, origin: "Candidatura",
        })),
        ...((rd ?? []) as any[]).map((d) => ({
          id: d.id, kind: d.kind, fileName: d.file_name, path: d.storage_path,
          bucket: "resident-documents" as const, uploadedAt: d.uploaded_at, origin: d.uploaded_by_name ? `Equipa · ${d.uploaded_by_name}` : "Equipa",
        })),
      ];
    },
  });

  const all: Doc[] = legacyPath
    ? [...docs, { id: "legacy", kind: "signed_contract", fileName: legacyPath.split("/").pop() ?? "contrato.pdf", path: legacyPath, bucket: "resident-documents", uploadedAt: "", origin: "Conta do residente" }]
    : docs;
  const groups = ORDER.map((k) => ({
    kind: k,
    docs: all.filter((d) => (ORDER.includes(d.kind as any) ? d.kind : "other") === k).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
  })).filter((g) => g.docs.length);

  const open = async (d: Doc) => {
    // Abre a janela já no clique: no telemóvel, janelas abertas depois de esperar são bloqueadas.
    const win = window.open("", "_blank");
    const { data, error } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, 300);
    if (error || !data) {
      win?.close();
      return toast.error(error?.message ?? "Não foi possível abrir o documento");
    }
    if (win) {
      win.opener = null;
      win.location.href = data.signedUrl;
    } else toast("Documento pronto", { action: { label: "Abrir", onClick: () => window.open(data.signedUrl, "_blank", "noopener") } });
  };

  const downloadAll = async () => {
    if (preparing) return;
    setPreparing(true);
    setPrepared(null);
    let failures = 0;
    try {
      const result = await createResidentDocumentZip(all, (d) => kindLabel(d.kind, profile), async (d) => {
        const { data, error } = await supabase.storage.from(d.bucket).createSignedUrl(d.path, 300);
        if (error || !data) throw error ?? new Error("Documento indisponível");
        const response = await fetch(data.signedUrl);
        if (!response.ok) throw new Error("Não foi possível descarregar o documento");
        return response.blob();
      });
      failures = result.failed;
      if (!result.blob) {
        toast.error(`Não foi possível preparar o ZIP: ${result.failed} ficheiro(s) falharam.`);
        return;
      }
      const filename = residentZipName(residentName, roomCode);
      // Uma nova ação de toque preserva a ativação exigida pelo Safari após a preparação.
      if (matchMedia("(pointer: coarse)").matches) setPrepared({ blob: result.blob, filename });
      else await deliverResidentZip(result.blob, filename);
      if (result.failed) toast.error(`ZIP preparado com ${result.included} ficheiro(s); ${result.failed} ficheiro(s) falharam.`);
      else toast.success(`ZIP preparado com ${result.included} ficheiro(s).`);
    } catch {
      toast.error(`Não foi possível preparar o ZIP.${failures ? ` ${failures} ficheiro(s) falharam.` : ""}`);
    } finally {
      setPreparing(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) return toast.error("Formato não permitido (PDF, JPG, PNG).");
    if (file.size > MAX_BYTES) return toast.error("Máximo 10 MB por ficheiro.");
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Não autenticado");
      const path = `staff/${residentId}/${crypto.randomUUID()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage.from("resident-documents").upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", uid).maybeSingle();
      const { error: insErr } = await supabase.from("resident_documents").insert({
        resident_id: residentId, kind, file_name: file.name, storage_path: path,
        file_type: file.type || null, uploaded_by: uid, uploaded_by_name: (prof as any)?.full_name ?? null,
      });
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["resident-documents", residentId] });
      toast.success("Documento carregado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar o documento");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <Card className="p-4 border-border/60 shadow-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Documentos</h3>
        {all.length > 0 && (
          <Button size="sm" variant="outline" disabled={preparing} onClick={downloadAll}>
            {preparing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            {preparing ? "A preparar…" : "Descarregar tudo (ZIP)"}
          </Button>
        )}
        {prepared && <Button size="sm" onClick={() => { void deliverResidentZip(prepared.blob, prepared.filename).catch(() => toast.error("Não foi possível descarregar o ZIP.")); }}><Download className="h-3.5 w-3.5 mr-1.5" />Descarregar ZIP preparado</Button>}
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem documentos.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.kind}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{kindLabel(g.kind, profile)}</div>
              <div className="space-y-1.5">
                {g.docs.map((d, i) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => open(d)}
                    className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left hover:bg-muted/40 transition-colors ${i === 0 ? "border-primary/40 bg-primary/5" : "border-border/60 opacity-70"}`}
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                    <span className={`text-sm truncate flex-1 ${i === 0 ? "font-medium" : ""}`}>{d.fileName}</span>
                    {i === 0 && g.docs.length > 1 && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">Mais recente</Badge>}
                    <span className="text-xs text-muted-foreground shrink-0">{d.origin} · {fmt(d.uploadedAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-[240px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAFF_KINDS.map((k) => <SelectItem key={k} value={k}>{kindLabel(k, profile)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />}
          Carregar documento
        </Button>
        <input ref={input} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </Card>
  );
};

export default ResidentDocuments;
