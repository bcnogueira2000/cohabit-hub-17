import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { isValidPtNif } from "../../../supabase/functions/_shared/ptNif";

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moloni-billing-nif", { body });
  const d = data as any;
  if (error || d?.error) throw new Error(d?.error ?? error?.message);
  return d as T;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-PT") : "—");

export function useBillingRecords(residentId: string) {
  return useQuery({
    queryKey: ["moloni-records", residentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resident_moloni_customers")
        .select("*")
        .eq("resident_id", residentId)
        .order("valid_from", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Botão «Atualizar NIF de faturação» + janela de troca. */
export function BillingNifButton({ residentId }: { residentId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "summary">("form");
  const [vat, setVat] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [number, setNumber] = useState("");
  const qc = useQueryClient();

  const preview = useQuery({
    queryKey: ["billing-nif-preview", residentId],
    queryFn: () => call<any>({ action: "preview", resident_id: residentId }),
    enabled: open,
    staleTime: 0,
  });

  const start = async () => {
    setStep("form");
    setOpen(true);
    const p = await qc.fetchQuery({ queryKey: ["billing-nif-preview", residentId], queryFn: () => call<any>({ action: "preview", resident_id: residentId }), staleTime: 0 }).catch((e) => { toast.error(e.message); setOpen(false); return null; });
    if (!p) return;
    setVat("");
    setAddress(p.resident.address ?? "");
    setZip(p.resident.postal_code ?? "");
    setCity(p.resident.city ?? "");
    setNumber(p.proposed_number);
  };

  const change = useMutation({
    mutationFn: () => call({ action: "change", confirm: true, resident_id: residentId, new_vat: vat, address, postal_code: zip, city, valid_from: month, customer_number: number }),
    onSuccess: () => {
      toast.success("Ficha nova criada no Moloni e definida como ativa. Falta suspender a antiga no Moloni.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["moloni-records", residentId] });
      qc.invalidateQueries({ queryKey: ["resident", residentId] });
      qc.invalidateQueries({ queryKey: ["residents"] });
    },
  });

  const p = preview.data;
  const nifOk = isValidPtNif(vat);
  const monthKey = (c: any) => `${c.year}-${String(c.month).padStart(2, "0")}`;
  const issued = (p?.charges ?? []).filter((c: any) => c.moloni_document_id);
  const toMove = (p?.charges ?? []).filter((c: any) => !c.moloni_document_id && monthKey(c) >= month);
  const canNext = nifOk && address.trim() && number.trim() && /^\d{4}-\d{2}$/.test(month);

  return (
    <>
      <Button type="button" variant="outline" className="rounded-full" onClick={start}>
        Atualizar NIF de faturação
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!change.isPending) { setOpen(o); change.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atualizar NIF de faturação</DialogTitle>
            <DialogDescription>Cria uma ficha nova no Moloni. A ficha atual fica arquivada e as faturas já emitidas não mudam.</DialogDescription>
          </DialogHeader>

          {!p ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : step === "form" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3 text-sm space-y-0.5">
                <p className="font-medium mb-1">Ficha atual</p>
                <p>NIF: {p.active.vat ?? "—"}</p>
                <p>Número de cliente: {p.active.customer_number ?? "—"}</p>
                <p>Nome: {p.resident.full_name}</p>
                <p>Morada: {[p.active.address, p.active.zip_code, p.active.city].filter(Boolean).join(", ") || "—"}</p>
              </div>
              <div className="space-y-1.5">
                <Label>NIF novo</Label>
                <Input inputMode="numeric" value={vat} onChange={(e) => setVat(e.target.value.replace(/\D/g, "").slice(0, 9))} />
                {vat.length === 9 && !nifOk && <p className="text-xs text-destructive">NIF inválido.</p>}
              </div>
              <div className="space-y-1.5"><Label>Morada</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Código postal</Label><Input value={zip} onChange={(e) => setZip(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Localidade</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Válido a partir de</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Número da ficha nova</Label><Input value={number} onChange={(e) => setNumber(e.target.value.trim())} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button disabled={!canNext} onClick={() => setStep("summary")}>Ver resumo</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="font-medium">Ficha antiga — fica arquivada</p>
                <p className="text-muted-foreground">NIF {p.active.vat ?? "—"} · nº {p.active.customer_number ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                <p className="font-medium">Ficha nova — passa a ser a ativa</p>
                <p className="text-muted-foreground">NIF {vat} · nº {number} · a partir de {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</p>
                <p className="text-muted-foreground">{[address, zip, city].filter(Boolean).join(", ")}</p>
              </div>
              <div>
                <p className="font-medium">Cobranças já emitidas — ficam como estão ({issued.length})</p>
                <p className="text-muted-foreground">{issued.map((c: any) => `${MONTHS[c.month - 1]} ${c.year}`).join(", ") || "Nenhuma"}</p>
              </div>
              <div>
                <p className="font-medium">Cobranças por emitir — vão para a ficha nova ({toMove.length})</p>
                <p className="text-muted-foreground">{toMove.map((c: any) => `${MONTHS[c.month - 1]} ${c.year} (${Number(c.amount).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })})`).join(", ") || "Nenhuma"}</p>
              </div>
              {change.error && (
                <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{(change.error as Error).message} O residente continua ligado à ficha antiga.</span>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" disabled={change.isPending} onClick={() => setStep("form")}>Voltar</Button>
                <Button disabled={change.isPending} onClick={() => change.mutate()}>
                  {change.isPending ? "A criar no Moloni…" : "Confirmar e criar ficha no Moloni"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Histórico de fichas Moloni do residente, com lembrete de suspensão. */
export function BillingRecordsHistory({ residentId }: { residentId: string }) {
  const { data: records = [] } = useBillingRecords(residentId);
  const qc = useQueryClient();
  const mark = useMutation({
    mutationFn: (recordId: string) => call({ action: "mark_suspended", resident_id: residentId, record_id: recordId }),
    onSuccess: () => { toast.success("Marcada como suspensa no Moloni"); qc.invalidateQueries({ queryKey: ["moloni-records", residentId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (records.length < 2 && !records.some((r: any) => r.status === "archived")) return null;
  return (
    <div className="sm:col-span-2 rounded-lg border border-border p-3 text-sm">
      <p className="font-medium mb-2">Fichas de faturação no Moloni</p>
      <ul className="space-y-2">
        {records.map((r: any) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono">{r.customer_number ?? "—"}</span> · NIF {r.vat ?? "—"} ·{" "}
              <span className={r.status === "active" ? "text-success" : "text-muted-foreground"}>{r.status === "active" ? "Ativa" : "Arquivada"}</span>
              <div className="text-xs text-muted-foreground">
                {r.valid_from > "1901-01-01" ? `Válida desde ${fmtDate(r.valid_from)}` : `Em uso desde ${fmtDate(r.active_from)}`}
                {r.archived_at && ` · arquivada em ${fmtDate(r.archived_at)}`} · id Moloni {r.moloni_customer_id}
                {r.suspended_in_moloni_at && ` · suspensa no Moloni (${r.suspended_marked_by_name ?? "—"}, ${fmtDate(r.suspended_in_moloni_at)})`}
              </div>
            </div>
            {r.status === "archived" && !r.suspended_in_moloni_at && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-warning">Suspender esta ficha no Moloni</span>
                <Button size="sm" variant="outline" className="rounded-full" disabled={mark.isPending} onClick={() => mark.mutate(r.id)}>Marcar como feito</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
