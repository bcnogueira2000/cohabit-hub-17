import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PaymentStateBadge } from "@/components/payments/PaymentStateBadge";
import { useContractLedger, useCreatePayment, paymentMethodLabels, type PaymentMethod } from "@/hooks/usePayments";
import { useMoloniDocumentPdf } from "@/hooks/useMoloni";
import { balanceLabel, ledgerKindLabels, ledgerSummary, type LedgerEntry } from "@/lib/contractLedger";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

const Stat = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) => (
  <Card className="p-4 border-border/60 shadow-card">
    <span className="text-xs text-muted-foreground block">{label}</span>
    <span className={cn("font-display text-xl font-semibold block mt-1", tone)}>{value}</span>
    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
  </Card>
);

const PdfButton = ({ entry }: { entry: LedgerEntry }) => {
  const pdf = useMoloniDocumentPdf();
  const has = !!entry.moloniDocumentNumber && !!entry.rentChargeId;
  if (!has) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span><Button size="sm" variant="ghost" disabled className="h-7 px-2"><FileText className="h-4 w-4" strokeWidth={1.5} /></Button></span>
          </TooltipTrigger>
          <TooltipContent>Sem documento emitido</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pdf.isPending} onClick={() => pdf.mutate(entry.rentChargeId!)}>
      <FileText className="h-4 w-4 mr-1" strokeWidth={1.5} /> {entry.moloniDocumentNumber}
    </Button>
  );
};

const PayDialog = ({ contractId, charge, onClose }: { contractId: string; charge: LedgerEntry | null; onClose: () => void }) => {
  const create = useCreatePayment();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!charge) return;
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    if (!amount || amount <= 0) return toast.error("Indica o valor");
    try {
      await create.mutateAsync({
        contractId, rentChargeId: charge.sourceId, amount,
        paidAt: String(fd.get("paidAt")), method: String(fd.get("method")) as PaymentMethod,
        reference: String(fd.get("reference") || ""),
      });
      toast.success("Pagamento registado");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao registar pagamento");
    }
  };
  return (
    <Dialog open={!!charge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registar pagamento · {charge?.description}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Valor</Label><Input name="amount" type="number" step="0.01" defaultValue={charge?.outstanding ?? 0} /></div>
          <div><Label>Data</Label><Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div>
            <Label>Método</Label>
            <select name="method" defaultValue="transfer" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><Label>Referência</Label><Input name="reference" /></div>
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "A registar…" : "Registar pagamento"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ContractLedger = ({ contractId, code }: { contractId: string; code?: string | null }) => {
  const { data: entries = [], isLoading } = useContractLedger(contractId);
  const [kind, setKind] = useState("all");
  const [showVoided, setShowVoided] = useState(false);
  const [paying, setPaying] = useState<LedgerEntry | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const s = useMemo(() => ledgerSummary(entries, today), [entries, today]);

  const rows = entries.filter((e) => (showVoided || e.status === "active") && (kind === "all" || e.kind === kind));
  const kinds = Array.from(new Set(entries.map((e) => e.kind)));

  const exportCsv = () => {
    const head = ["Data", "Tipo", "Descrição", "A pagar", "Pago", "Saldo", "Estado", "Documento", "Conta no saldo"];
    const lines = rows.map((e) => [
      e.entryDate, ledgerKindLabels[e.kind] ?? e.kind, e.description, e.debit.toFixed(2), e.credit.toFixed(2),
      e.runningBalance.toFixed(2), e.status === "voided" ? "Anulado" : e.paymentState ?? "", e.moloniDocumentNumber ?? "",
      e.countsInBalance ? "sim" : "não",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `conta-corrente-${code ?? contractId}.csv`;
    a.click();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;

  const balTone = s.balance > 0.005 ? "text-destructive" : s.balance < -0.005 ? "text-info" : "text-success";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Saldo atual" value={eur(Math.abs(s.balance))} hint={balanceLabel(s.balance)} tone={balTone} />
        <Stat label="Em atraso" value={eur(s.overdue)} tone={s.overdue > 0 ? "text-destructive" : undefined} />
        <Stat label="Próximo pagamento" value={s.next ? eur(s.next.outstanding ?? 0) : "—"} hint={s.next ? fmtDate(s.next.entryDate) : "sem rendas futuras"} />
        <Stat label="Caução retida" value={eur(s.depositHeld)} />
        <Stat label="Total pago (rendas)" value={eur(s.totalPaid)} />
      </div>

      <Card className="p-5 border-border/60 shadow-card">
        <h3 className="font-display text-lg font-semibold mb-3">A pagar ({s.open.length})</h3>
        {s.open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma renda por pagar.</p>
        ) : (
          <div className="space-y-2">
            {s.open.map((e) => (
              <div key={e.sourceId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{e.description}</div>
                  <div className="text-xs text-muted-foreground">Vence {fmtDate(e.entryDate)}</div>
                </div>
                {e.paymentState && <PaymentStateBadge state={e.paymentState} />}
                <span className="font-display font-semibold">{eur(e.outstanding ?? 0)}</span>
                <Button size="sm" variant="outline" onClick={() => setPaying(e)}>Registar pagamento</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 border-border/60 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-lg font-semibold">Extrato</h3>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {kinds.map((k) => <SelectItem key={k} value={k}>{ledgerKindLabels[k] ?? k}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm"><Switch checked={showVoided} onCheckedChange={setShowVoided} /> Mostrar anuladas</label>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Exportar CSV</Button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground text-left">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Data</th><th className="pr-3">Tipo</th><th className="pr-3">Descrição</th>
                  <th className="pr-3 text-right">A pagar</th><th className="pr-3 text-right">Pago</th>
                  <th className="pr-3 text-right">Saldo</th><th className="pr-3">Estado</th><th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const voided = e.status === "voided";
                  return (
                    <tr key={e.source + e.sourceId} className={cn("border-b border-border/50 align-top", !e.countsInBalance && !voided && "text-muted-foreground")}>
                      <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(e.entryDate)}</td>
                      <td className="pr-3 whitespace-nowrap">{ledgerKindLabels[e.kind] ?? e.kind}</td>
                      <td className="pr-3">
                        <span className={cn(voided && "line-through")}>{e.description}</span>
                        {!e.countsInBalance && !voided && <span className="block text-[11px] italic">não conta no saldo</span>}
                        {voided && (
                          <span className="block text-[11px] text-destructive">
                            Anulado{e.voidedByName ? ` por ${e.voidedByName}` : ""}: {e.voidReason}
                          </span>
                        )}
                      </td>
                      <td className={cn("pr-3 text-right whitespace-nowrap", voided && "line-through")}>{e.debit ? eur(e.debit) : ""}</td>
                      <td className={cn("pr-3 text-right whitespace-nowrap", voided && "line-through")}>{e.credit ? eur(e.credit) : ""}</td>
                      <td className="pr-3 text-right whitespace-nowrap font-medium">{e.countsInBalance ? eur(e.runningBalance) : ""}</td>
                      <td className="pr-3">
                        {voided ? <span className="text-xs text-destructive">Anulado</span>
                          : e.source === "rent_charge" && e.paymentState ? <PaymentStateBadge state={e.paymentState} /> : null}
                      </td>
                      <td>{(e.kind === "rent" || e.kind === "rent_payment") && <PdfButton entry={e} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PayDialog contractId={contractId} charge={paying} onClose={() => setPaying(null)} />
    </div>
  );
};
