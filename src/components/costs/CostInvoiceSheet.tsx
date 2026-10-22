import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Download, FileText, History, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { CostFilePreview } from "./CostFilePreview";
import { useLocations } from "@/hooks/useLocations";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useMyRoles } from "@/hooks/useProfile";
import { extractInvoiceQrText } from "@/lib/invoiceQr";
import { SupplierCombobox } from "@/components/SupplierCombobox";
import { LocationCombobox } from "@/components/LocationCombobox";
import {
  costFileDownloadUrl, costFileUrl, extractCostInvoice, findDuplicateInvoice, useCostCategories, useCostInvoiceEvents,
  useFindOrCreateSupplier, useSaveCostInvoice, useSetCostStatus,
  type CostInvoice, type CostLine, type CostStatus,
} from "@/hooks/useCosts";

const NONE = "__none";
const emptyLine = (): CostLine => ({ categoryCode: null, description: null, net: null, vatRate: 23, vatAmount: null, locationId: null });
const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
const r2 = (n: number) => Math.round(n * 100) / 100;
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtTs = (s: string) => new Date(s).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const eventLabel = (a: string) =>
  a === "created" || a === "uploaded" ? "Carregada" : a === "edited" ? "Alterada"
  : a === "classified" ? "Classificada" : a === "paid" ? "Marcada como paga"
  : a === "reopened" ? "Reaberta" : a === "duplicate_confirmed" ? "Duplicado confirmado"
  : a === "file_replaced" ? "Ficheiro substituído" : a === "moloni_sent" ? "Enviada para o Moloni (rascunho)" : a;

interface Props {
  invoice: CostInvoice | null;
  autoExtract?: boolean;
  hasNext?: boolean;
  onNext?: () => void;
  onOpenInvoice?: (id: string) => void;
  onClose: () => void;
}

export const CostInvoiceSheet = ({ invoice, autoExtract, hasNext, onNext, onOpenInvoice, onClose }: Props) => {
  const { data: categories = [] } = useCostCategories();
  const { data: locations = [] } = useLocations({ excludeRooms: true });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-nif"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("suppliers").select("id,name,nif,default_category_code,default_location_id,default_vat_rate").eq("active", true).order("name");
      return (data ?? []) as { id: string; name: string; nif: string | null; default_category_code: string | null; default_location_id: string | null; default_vat_rate: number | null }[];
    },
  });
  const { data: fileUrl } = useQuery({
    enabled: !!invoice,
    queryKey: ["cost-file-url", invoice?.filePath],
    queryFn: () => costFileUrl(invoice!.filePath),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
  const { data: events = [] } = useCostInvoiceEvents(invoice?.id);
  const save = useSaveCostInvoice();
  const setStatus = useSetCostStatus();
  const findSupplier = useFindOrCreateSupplier();

  const [f, setF] = useState({
    supplierId: null as string | null, supplierName: "", supplierNif: "", invoiceNumber: "", invoiceDate: "", dueDate: "", atcud: "", notes: "",
  });
  const [lines, setLines] = useState<CostLine[]>([emptyLine()]);
  const [source, setSource] = useState<"qr" | "ai" | "manual" | undefined>();
  const [uncertain, setUncertain] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [expectedTotal, setExpectedTotal] = useState<number | null>(null);
  const [showFile, setShowFile] = useState(false);
  const [saveDefaults, setSaveDefaults] = useState(false);
  const [payDialog, setPayDialog] = useState(false);
  const [paidAt, setPaidAt] = useState(todayStr());
  const [reopenDialog, setReopenDialog] = useState(false);
  const [dup, setDup] = useState<{ id: string; supplier_name: string | null; invoice_number: string; invoice_date: string | null; total_gross: number | null } | null>(null);
  const dupOk = useRef(false);

  useEffect(() => {
    if (!invoice) return;
    setF({
      supplierId: invoice.supplierId, supplierName: invoice.supplierName ?? "", supplierNif: invoice.supplierNif ?? "",
      invoiceNumber: invoice.invoiceNumber ?? "", invoiceDate: invoice.invoiceDate ?? "", dueDate: invoice.dueDate ?? "",
      atcud: invoice.atcud ?? "", notes: invoice.notes ?? "",
    });
    setLines(invoice.lines.length ? invoice.lines : [emptyLine()]);
    setExpectedTotal(invoice.totalGross);
    setSource((invoice.extractionSource as any) ?? undefined);
    setUncertain(new Set(Object.entries(invoice.extractionConfidence ?? {}).filter(([, v]) => v === "low").map(([k]) => k)));
    setSaveDefaults(false);
    setDup(null);
    dupOk.current = false;
    setShowFile(false);
    if (autoExtract && invoice.status === "to_classify" && !invoice.invoiceNumber && invoice.extractionSource === "manual") runExtract(invoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  const locked = invoice?.status === "paid";
  const qc = useQueryClient();
  const { data: myRoles = [] } = useMyRoles();
  const canSendMoloni = myRoles.includes("admin" as any) || myRoles.includes("manager" as any);
  const [moloniDialog, setMoloniDialog] = useState(false);
  const [sendingMoloni, setSendingMoloni] = useState(false);
  const sentToMoloni = !!invoice?.moloniSentAt;
  const editedAfterSend = sentToMoloni && new Date(invoice!.updatedAt).getTime() - new Date(invoice!.moloniSentAt!).getTime() > 60_000;
  const sendToMoloni = async () => {
    if (!invoice) return;
    setSendingMoloni(true);
    try {
      const { data, error } = await supabase.functions.invoke("moloni-supplier-invoice", { body: { action: "send", invoice_id: invoice.id } });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* ignore */ } }
        throw new Error(msg);
      }
      toast({ title: "Rascunho criado no Moloni", description: `Referência ${data.reference}. A Marta pode conferir e aprovar no Moloni.` });
      qc.invalidateQueries({ queryKey: ["cost-invoices"] });
      qc.invalidateQueries({ queryKey: ["cost-invoice-events", invoice.id] });
    } catch (e) {
      toast({ title: "O Moloni não aceitou o envio", description: (e as Error).message, variant: "destructive" });
    } finally { setSendingMoloni(false); setMoloniDialog(false); }
  };
  const groups = useMemo(() => {
    const m = new Map<string, typeof categories>();
    categories.filter((c) => c.active).forEach((c) => m.set(c.groupName, [...(m.get(c.groupName) ?? []), c]));
    return [...m.entries()];
  }, [categories]);

  // Utilities e seguros associam-se por defeito ao edifício.
  const buildingId = useMemo(() => locations.find((l) => l.name === "Edifício")?.id ?? null, [locations]);
  const buildingGroup = (code: string | null) => {
    const g = categories.find((c) => c.code === code)?.groupCode;
    return g === "UTI" || g === "INS";
  };
  const computed = lines.map((l) => ({
    ...l,
    locationId: l.locationId ?? (buildingGroup(l.categoryCode) ? buildingId : null),
    vatAmount: l.vatAmount ?? (l.net != null && l.vatRate != null ? r2((l.net * l.vatRate) / 100) : null),
  }));
  const total = r2(computed.reduce((s, l) => s + (l.net ?? 0) + (l.vatAmount ?? 0), 0));
  const mismatch = expectedTotal != null && Math.abs(expectedTotal - total) > 0.02;

  const flag = (k: string) => uncertain.has(k) ? "ring-2 ring-amber-400 border-amber-400" : "";
  const clearFlag = (k: string) => setUncertain((u) => { if (!u.has(k)) return u; const n = new Set(u); n.delete(k); return n; });
  const setField = (patch: Partial<typeof f>) => {
    setF((p) => ({ ...p, ...patch }));
    Object.keys(patch).forEach((k) => clearFlag({ supplierName: "supplier_name", supplierNif: "supplier_nif", invoiceNumber: "invoice_number", invoiceDate: "invoice_date", dueDate: "due_date" }[k] ?? k));
  };

  const runExtract = async (inv: CostInvoice) => {
    setExtracting(true);
    try {
      const url = await costFileUrl(inv.filePath);
      const blob = await (await fetch(url)).blob();
      const qrText = await extractInvoiceQrText(new File([blob], inv.fileName, { type: inv.fileType }));
      const { data: d, uncertain: unc, source: src } = await extractCostInvoice(inv.filePath, categories, qrText);
      const nif = d.supplier_nif?.replace(/\D/g, "") || "";
      const match = suppliers.find((s) => nif && s.nif?.replace(/\D/g, "") === nif);
      setF((p) => ({
        ...p,
        supplierId: match?.id ?? p.supplierId,
        supplierName: match?.name ?? d.supplier_name ?? p.supplierName,
        supplierNif: nif || p.supplierNif,
        invoiceNumber: d.invoice_number ?? p.invoiceNumber,
        invoiceDate: d.invoice_date ?? p.invoiceDate,
        dueDate: d.due_date ?? d.invoice_date ?? p.dueDate,
        atcud: d.atcud ?? p.atcud,
      }));
      const net = d.total_net ?? (d.total_gross != null && d.total_vat != null ? r2(d.total_gross - d.total_vat) : null);
      setLines([{
        categoryCode: match?.default_category_code ?? (categories.some((c) => c.code === d.category_code) ? d.category_code! : null),
        description: d.description ?? null,
        net,
        vatRate: d.vat_rate ?? match?.default_vat_rate ?? 23,
        vatAmount: d.total_vat ?? null,
        locationId: match?.default_location_id ?? null,
      }]);
      setExpectedTotal(d.total_gross ?? null);
      setSource(src);
      setUncertain(new Set(unc));
      toast({ title: "Fatura lida automaticamente", description: unc.length ? "Confirma os campos assinalados a amarelo." : "Confirma os dados antes de classificar." });
    } catch (e: any) {
      toast({ title: "Não foi possível ler a fatura", description: e?.message ?? "Preenche à mão.", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const pickSupplier = (id: string | null) => {
    const s = suppliers.find((x) => x.id === id);
    setF((p) => ({ ...p, supplierId: s?.id ?? null, supplierName: s?.name ?? p.supplierName, supplierNif: s?.nif ?? p.supplierNif }));
    if (s) {
      setLines((ls) => ls.map((l) => ({
        ...l,
        categoryCode: l.categoryCode ?? s.default_category_code,
        vatRate: l.categoryCode ? l.vatRate : (s.default_vat_rate ?? l.vatRate),
        locationId: l.locationId ?? s.default_location_id,
      })));
    }
  };

  const doSave = async (status: CostStatus, paidDate?: string) => {
    if (!invoice) return;
    if (status !== "to_classify" && !dupOk.current) {
      const d = await findDuplicateInvoice(f.supplierNif, f.invoiceNumber, invoice.id);
      if (d) { setDup(d); return; }
    }
    try {
      let supplierId = f.supplierId;
      if (!supplierId && f.supplierName.trim()) {
        supplierId = await findSupplier.mutateAsync({ name: f.supplierName.trim(), nif: f.supplierNif.trim() || null });
      }
      await save.mutateAsync({
        id: invoice.id, supplierId, supplierName: f.supplierName || null, supplierNif: f.supplierNif || null,
        invoiceNumber: f.invoiceNumber || null, invoiceDate: f.invoiceDate || null, dueDate: f.dueDate || null,
        atcud: f.atcud || null, notes: f.notes || null, extractionSource: source === "manual" ? undefined : source,
        lines: computed, status, paidAt: paidDate ?? null, saveSupplierDefaults: saveDefaults && !!supplierId,
      });
      toast({ title: status === "to_classify" ? "Rascunho guardado" : status === "classified" ? "Fatura classificada" : "Fatura classificada e marcada como paga" });
      if (status !== "to_classify" && hasNext && onNext) onNext();
      else onClose();
    } catch (e: any) {
      toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" });
    }
  };

  const updLine = (i: number, patch: Partial<CostLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch, ...(patch.net !== undefined || patch.vatRate !== undefined ? { vatAmount: null } : {}) } : l)));

  const [downloading, setDownloading] = useState(false);

  const downloadFile = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const url = await costFileDownloadUrl(invoice.filePath, invoice.fileName);
      const a = document.createElement("a");
      a.href = url;
      a.download = invoice.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast({ title: "Não foi possível descarregar", description: e?.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const busy = save.isPending || setStatus.isPending || findSupplier.isPending;

  const preview = invoice && fileUrl && <CostFilePreview fileUrl={fileUrl} fileType={invoice.fileType} />;

  return (
    <Sheet open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        {invoice && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl flex items-center gap-2 flex-wrap">
                {invoice.invoiceNumber || "Nova fatura"}
                {uncertain.size > 0 && <span className="text-xs font-normal text-amber-600 bg-amber-500/10 rounded-full px-2 py-0.5">Confirma os campos a amarelo</span>}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFile((v) => !v)}>
                <FileText className="h-4 w-4 mr-1.5" /> {showFile ? "Ver formulário" : "Ver ficheiro"}
              </Button>
              <Button variant="outline" size="sm" disabled={downloading} onClick={downloadFile}>
                {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                {downloading ? "A descarregar…" : "Descarregar"}
              </Button>
              {!locked && (
                <Button variant="outline" size="sm" disabled={extracting} onClick={() => runExtract(invoice)}>
                  {extracting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {extracting ? "A ler…" : "Ler automaticamente"}
                </Button>
              )}
            </div>

            <div className="mt-4 lg:grid lg:grid-cols-2 lg:gap-5">
              <div className={`${showFile ? "block" : "hidden"} lg:block mb-4 lg:mb-0 lg:sticky lg:top-0 self-start`}>
                {fileUrl ? preview : (
                  <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A abrir ficheiro…
                  </div>
                )}
              </div>

              <fieldset disabled={locked || extracting} className={`${showFile ? "hidden" : "block"} lg:block space-y-4 min-w-0`}>
                <div className="space-y-3">
                  <div>
                    <Label>Fornecedor</Label>
                    <SupplierCombobox value={f.supplierId} onChange={pickSupplier} noneLabel="Novo fornecedor (usa nome e NIF abaixo)" />
                  </div>
                  {!f.supplierId && (
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-border/60 p-2.5">
                      <div><Label className="text-xs">Nome (novo fornecedor)</Label><Input className={flag("supplier_name")} value={f.supplierName} onChange={(e) => setField({ supplierName: e.target.value })} /></div>
                      <div><Label className="text-xs">NIF</Label><Input className={flag("supplier_nif")} value={f.supplierNif} onChange={(e) => setField({ supplierNif: e.target.value })} /></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>N.º fatura</Label><Input className={flag("invoice_number")} value={f.invoiceNumber} onChange={(e) => setField({ invoiceNumber: e.target.value })} /></div>
                    <div><Label>Data</Label><Input className={flag("invoice_date")} type="date" value={f.invoiceDate} onChange={(e) => setField({ invoiceDate: e.target.value })} /></div>
                    <div><Label>Vencimento</Label><Input className={flag("due_date")} type="date" value={f.dueDate} onChange={(e) => setField({ dueDate: e.target.value })} /></div>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground select-none">Campos técnicos (ATCUD)</summary>
                    <div className="mt-2"><Label>ATCUD</Label><Input value={f.atcud} onChange={(e) => setField({ atcud: e.target.value })} /></div>
                  </details>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Linhas</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4 mr-1" /> Linha</Button>
                  </div>
                  {lines.map((l, i) => (
                    <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Select value={l.categoryCode ?? NONE} onValueChange={(v) => { updLine(i, { categoryCode: v === NONE ? null : v }); clearFlag("category_code"); }}>
                          <SelectTrigger className={flag("category_code")}><SelectValue placeholder="Categoria" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Sem categoria</SelectItem>
                            {groups.map(([g, cs]) => (
                              <div key={g}>
                                <div className="px-2 pt-2 pb-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">{g}</div>
                                {cs.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <LocationCombobox value={computed[i]?.locationId ?? l.locationId} onChange={(v) => updLine(i, { locationId: v })} placeholder="Espaço" />
                      </div>
                      <Input placeholder="Descrição" value={l.description ?? ""} onChange={(e) => updLine(i, { description: e.target.value || null })} />
                      <div className="grid grid-cols-[1fr_90px_1fr_auto] gap-2 items-center">
                        <Input className={flag("total_net")} inputMode="decimal" placeholder="Valor s/ IVA" value={l.net ?? ""} onChange={(e) => { updLine(i, { net: numOrNull(e.target.value) }); clearFlag("total_net"); clearFlag("total_gross"); }} />
                        <Input inputMode="decimal" placeholder="IVA %" value={l.vatRate ?? ""} onChange={(e) => updLine(i, { vatRate: numOrNull(e.target.value) })} />
                        <div className="text-sm text-muted-foreground text-right">IVA {eur(computed[i].vatAmount ?? 0)}</div>
                        <Button type="button" variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remover linha">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">Total com IVA</span>
                    <span className={`font-display text-lg font-semibold ${flag("total_gross")}`}>{eur(total)}</span>
                  </div>
                  {mismatch && (
                    <p className="text-xs text-destructive">O total das linhas não bate com o total lido na fatura ({eur(expectedTotal!)}).</p>
                  )}
                </div>

                <div><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={(e) => setField({ notes: e.target.value })} /></div>

                {f.supplierId && !locked && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <Checkbox checked={saveDefaults} onCheckedChange={(v) => setSaveDefaults(v === true)} />
                    Guardar categoria, IVA e espaço como predefinições deste fornecedor
                  </label>
                )}
              </fieldset>
            </div>

            {dup && (
              <div className="mt-4 rounded-lg border border-amber-400 bg-amber-500/10 p-3 space-y-2">
                <div className="flex gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Já existe uma fatura deste fornecedor com o número <b>{dup.invoice_number}</b> ({dup.invoice_date ?? "sem data"}, {dup.total_gross != null ? eur(dup.total_gross) : "—"}). Confirma que não é a mesma fatura?</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setDup(null); onOpenInvoice?.(dup.id); }}>Ver a outra fatura</Button>
                  <Button size="sm" variant="ghost" onClick={() => { dupOk.current = true; setDup(null); }}>Não é duplicada, deixar-me guardar</Button>
                </div>
              </div>
            )}

            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-smooth">
                <History className="h-4 w-4" /> Histórico ({events.length}) <ChevronDown className="h-3.5 w-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {events.length === 0 && <p className="text-xs text-muted-foreground">Sem registos.</p>}
                {events.map((e) => (
                  <div key={e.id} className="text-xs text-muted-foreground flex justify-between gap-2">
                    <span><b className="text-foreground font-medium">{e.userName ?? "Sistema"}</b> — {eventLabel(e.action)}{e.details?.paid_at ? ` (${e.details.paid_at})` : ""}</span>
                    <span className="shrink-0">{fmtTs(e.createdAt)}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {sentToMoloni && (
              <div className={`mt-4 rounded-lg border p-3 text-sm ${editedAfterSend ? "border-amber-500/40 bg-amber-500/10" : "border-border/60 bg-muted/40"}`}>
                <p className="font-medium">No Moloni: {invoice.moloniDocumentNumber ?? "rascunho"} · enviada a {fmtTs(invoice.moloniSentAt!)}</p>
                {editedAfterSend && <p className="mt-1 flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> Esta fatura foi alterada depois do envio. O rascunho no Moloni não se atualiza sozinho — confirma-o lá manualmente.</p>}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              {canSendMoloni && !sentToMoloni && invoice.status !== "to_classify" && (
                <Button variant="outline" disabled={sendingMoloni} onClick={() => setMoloniDialog(true)} className="mr-auto">
                  {sendingMoloni ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Enviar para o Moloni
                </Button>
              )}
              {locked ? (
                <Button variant="outline" disabled={busy} onClick={() => setReopenDialog(true)}>Reabrir</Button>
              ) : (
                <>
                  <Button variant="ghost" disabled={busy} onClick={() => doSave("to_classify")}>Guardar rascunho</Button>
                  <Button variant="outline" disabled={busy} onClick={() => { setPaidAt(todayStr()); setPayDialog(true); }}>Classificar e marcar paga</Button>
                  <Button disabled={busy} onClick={() => doSave("classified")}>
                    {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    {hasNext ? "Classificar e seguinte" : "Classificar"}
                  </Button>
                </>
              )}
            </div>

            <AlertDialog open={payDialog} onOpenChange={setPayDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Marcar como paga</AlertDialogTitle>
                  <AlertDialogDescription>Usa esta opção para faturas já pagas no momento da compra (cartão, débito direto). Confirma a data de pagamento.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2"><Label>Data de pagamento</Label><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction disabled={!paidAt} onClick={() => doSave("paid", paidAt)}>Confirmar pagamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={moloniDialog} onOpenChange={setMoloniDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar para o Moloni?</AlertDialogTitle>
                  <AlertDialogDescription>Cria a fatura de fornecedor em rascunho na série FORN, com o fornecedor, datas e linhas desta fatura. Nada é fechado nem comunicado às Finanças; a aprovação é feita no Moloni. Uma fatura só pode ser enviada uma vez.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction disabled={sendingMoloni} onClick={(e) => { e.preventDefault(); sendToMoloni(); }}>
                    {sendingMoloni && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Enviar rascunho
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={reopenDialog} onOpenChange={setReopenDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reabrir fatura paga?</AlertDialogTitle>
                  <AlertDialogDescription>A fatura volta ao estado “A pagar”. Só gestão/admin pode reabrir faturas pagas.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    try { await setStatus.mutateAsync({ id: invoice.id, status: "classified" }); toast({ title: "Fatura reaberta" }); onClose(); }
                    catch { toast({ title: "Não foi possível reabrir", description: "Só gestão/admin pode reabrir faturas pagas.", variant: "destructive" }); }
                  }}>Reabrir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
