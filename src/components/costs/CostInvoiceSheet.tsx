import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLocations } from "@/hooks/useLocations";
import {
  costFileUrl, extractCostInvoice, useCostCategories, useFindOrCreateSupplier, useSaveCostInvoice, useSetCostStatus,
  type CostInvoice, type CostLine, type CostStatus,
} from "@/hooks/useCosts";

const NONE = "__none";
const emptyLine = (): CostLine => ({ categoryCode: null, description: null, net: null, vatRate: 23, vatAmount: null, locationId: null });
const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
const r2 = (n: number) => Math.round(n * 100) / 100;
const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

interface Props {
  invoice: CostInvoice | null;
  autoExtract?: boolean;
  onClose: () => void;
}

export const CostInvoiceSheet = ({ invoice, autoExtract, onClose }: Props) => {
  const { data: categories = [] } = useCostCategories();
  const { data: locations = [] } = useLocations({ excludeRooms: true });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-nif"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("suppliers").select("id,name,nif,default_category_code,default_location_id,default_vat_rate").eq("active", true).order("name");
      return (data ?? []) as { id: string; name: string; nif: string | null; default_category_code: string | null; default_location_id: string | null; default_vat_rate: number | null }[];
    },
  });
  const save = useSaveCostInvoice();
  const setStatus = useSetCostStatus();
  const findSupplier = useFindOrCreateSupplier();

  const [f, setF] = useState({
    supplierId: null as string | null, supplierName: "", supplierNif: "", invoiceNumber: "", invoiceDate: "", dueDate: "", atcud: "", notes: "",
  });
  const [lines, setLines] = useState<CostLine[]>([emptyLine()]);
  const [source, setSource] = useState<"ai" | "manual" | undefined>();
  const [extracting, setExtracting] = useState(false);
  const [expectedTotal, setExpectedTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!invoice) return;
    setF({
      supplierId: invoice.supplierId, supplierName: invoice.supplierName ?? "", supplierNif: invoice.supplierNif ?? "",
      invoiceNumber: invoice.invoiceNumber ?? "", invoiceDate: invoice.invoiceDate ?? "", dueDate: invoice.dueDate ?? "",
      atcud: invoice.atcud ?? "", notes: invoice.notes ?? "",
    });
    setLines(invoice.lines.length ? invoice.lines : [emptyLine()]);
    setExpectedTotal(invoice.totalGross);
    setSource(undefined);
    if (autoExtract && invoice.status === "to_classify" && !invoice.invoiceNumber) runExtract(invoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  const locked = invoice?.status === "paid";
  const groups = useMemo(() => {
    const m = new Map<string, typeof categories>();
    categories.filter((c) => c.active).forEach((c) => m.set(c.groupName, [...(m.get(c.groupName) ?? []), c]));
    return [...m.entries()];
  }, [categories]);

  const computed = lines.map((l) => ({ ...l, vatAmount: l.vatAmount ?? (l.net != null && l.vatRate != null ? r2((l.net * l.vatRate) / 100) : null) }));
  const total = r2(computed.reduce((s, l) => s + (l.net ?? 0) + (l.vatAmount ?? 0), 0));
  const mismatch = expectedTotal != null && Math.abs(expectedTotal - total) > 0.02;

  const runExtract = async (inv: CostInvoice) => {
    setExtracting(true);
    try {
      const d = await extractCostInvoice(inv.filePath, categories);
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
      setSource("ai");
      toast({ title: "Fatura lida", description: d.confidence === "low" ? "Leitura com pouca confiança — confirma os campos." : "Confirma os dados antes de guardar." });
    } catch (e: any) {
      toast({ title: "Não foi possível ler a fatura", description: e?.message ?? "Preenche à mão.", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const submit = async (status: CostStatus) => {
    if (!invoice) return;
    try {
      let supplierId = f.supplierId;
      if (!supplierId && f.supplierName.trim()) {
        supplierId = await findSupplier.mutateAsync({ name: f.supplierName.trim(), nif: f.supplierNif.trim() || null });
      }
      await save.mutateAsync({
        id: invoice.id, supplierId, supplierName: f.supplierName || null, supplierNif: f.supplierNif || null,
        invoiceNumber: f.invoiceNumber || null, invoiceDate: f.invoiceDate || null, dueDate: f.dueDate || null,
        atcud: f.atcud || null, notes: f.notes || null, extractionSource: source, lines: computed, status,
      });
      toast({ title: status === "to_classify" ? "Rascunho guardado" : status === "classified" ? "Fatura classificada" : "Fatura marcada como paga" });
      onClose();
    } catch (e: any) {
      toast({ title: "Não foi possível guardar", description: e?.message, variant: "destructive" });
    }
  };

  const updLine = (i: number, patch: Partial<CostLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch, ...(patch.net !== undefined || patch.vatRate !== undefined ? { vatAmount: null } : {}) } : l)));

  const busy = save.isPending || setStatus.isPending || findSupplier.isPending;

  return (
    <Sheet open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {invoice && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{invoice.invoiceNumber || "Nova fatura"}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={async () => window.open(await costFileUrl(invoice.filePath), "_blank")}>
                <ExternalLink className="h-4 w-4 mr-1.5" /> Ver ficheiro
              </Button>
              {!locked && (
                <Button variant="outline" size="sm" disabled={extracting} onClick={() => runExtract(invoice)}>
                  {extracting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {extracting ? "A ler…" : "Ler automaticamente"}
                </Button>
              )}
            </div>

            <fieldset disabled={locked || extracting} className="mt-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={f.supplierId ?? NONE}
                    onValueChange={(v) => {
                      const s = suppliers.find((x) => x.id === v);
                      setF((p) => ({ ...p, supplierId: s?.id ?? null, supplierName: s?.name ?? p.supplierName, supplierNif: s?.nif ?? p.supplierNif }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Escolher fornecedor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Novo fornecedor (usa nome e NIF abaixo)</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.nif ? ` · ${s.nif}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nome</Label><Input value={f.supplierName} onChange={(e) => setF({ ...f, supplierName: e.target.value })} /></div>
                <div><Label>NIF fornecedor</Label><Input value={f.supplierNif} onChange={(e) => setF({ ...f, supplierNif: e.target.value })} /></div>
                <div><Label>N.º fatura</Label><Input value={f.invoiceNumber} onChange={(e) => setF({ ...f, invoiceNumber: e.target.value })} /></div>
                <div><Label>ATCUD</Label><Input value={f.atcud} onChange={(e) => setF({ ...f, atcud: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="date" value={f.invoiceDate} onChange={(e) => setF({ ...f, invoiceDate: e.target.value })} /></div>
                <div><Label>Vencimento</Label><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Linhas</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-4 w-4 mr-1" /> Linha</Button>
                </div>
                {lines.map((l, i) => (
                  <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <Select value={l.categoryCode ?? NONE} onValueChange={(v) => updLine(i, { categoryCode: v === NONE ? null : v })}>
                        <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
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
                      <Select value={l.locationId ?? NONE} onValueChange={(v) => updLine(i, { locationId: v === NONE ? null : v })}>
                        <SelectTrigger><SelectValue placeholder="Espaço" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sem espaço</SelectItem>
                          {locations.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="Descrição" value={l.description ?? ""} onChange={(e) => updLine(i, { description: e.target.value || null })} />
                    <div className="grid grid-cols-[1fr_90px_1fr_auto] gap-2 items-center">
                      <Input inputMode="decimal" placeholder="Valor s/ IVA" value={l.net ?? ""} onChange={(e) => updLine(i, { net: numOrNull(e.target.value) })} />
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
                  <span className="font-display text-lg font-semibold">{eur(total)}</span>
                </div>
                {mismatch && (
                  <p className="text-xs text-destructive">O total das linhas não bate com o total lido na fatura ({eur(expectedTotal!)}).</p>
                )}
              </div>

              <div><Label>Notas</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            </fieldset>

            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              {locked ? (
                <Button variant="outline" disabled={busy} onClick={async () => {
                  try { await setStatus.mutateAsync({ id: invoice.id, status: "classified" }); toast({ title: "Fatura reaberta" }); onClose(); }
                  catch (e: any) { toast({ title: "Não foi possível reabrir", description: "Só gestão/admin pode reabrir faturas pagas.", variant: "destructive" }); }
                }}>Reabrir</Button>
              ) : (
                <>
                  <Button variant="ghost" disabled={busy} onClick={() => submit("to_classify")}>Guardar rascunho</Button>
                  <Button variant="outline" disabled={busy} onClick={() => submit("classified")}>Classificar</Button>
                  <Button disabled={busy} onClick={() => submit("paid")}>Classificar e marcar paga</Button>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
