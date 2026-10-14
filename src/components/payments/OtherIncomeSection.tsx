import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { PaymentStateBadge } from "@/components/payments/PaymentStateBadge";
import { PaymentEntry } from "@/components/payments/PaymentEntry";
import {
  paymentMethodLabels,
  useChargeableContracts,
  useCreateExtraCharge,
  useCreateExtraPayment,
  useExtraChargePayments,
  useExtraCharges,
  useServiceCatalog,
  useVoidExtraCharge,
  type ExtraChargeRow,
  type PaymentMethod,
} from "@/hooks/usePayments";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
const fmt = (d: string) => new Date(d).toLocaleDateString("pt-PT");
const todayISO = () => new Date().toISOString().slice(0, 10);
const CUSTOM = "__custom";

const NewExtraDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { data: services = [] } = useServiceCatalog();
  const { data: contracts = [] } = useChargeableContracts();
  const create = useCreateExtraCharge();
  const [contractId, setContractId] = useState("");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [customName, setCustomName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");
  const [due, setDue] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [reference, setReference] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const total = Math.round(Number(qty || 0) * Number(price || 0) * 100) / 100;
  const filtered = contracts.filter((c) => c.label.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  const reset = () => {
    setContractId(""); setSearch(""); setServiceId(""); setCustomName(""); setQty("1"); setPrice("0");
    setDue(todayISO()); setDescription(""); setNotes(""); setPayNow(false); setReference("");
  };

  const submit = async () => {
    if (!contractId) return toast({ title: "Escolhe o contrato", variant: "destructive" });
    if (!serviceId) return toast({ title: "Escolhe o serviço", variant: "destructive" });
    if (serviceId === CUSTOM && !customName.trim()) return toast({ title: "Indica o nome do serviço", variant: "destructive" });
    if (!(Number(qty) > 0)) return toast({ title: "Quantidade inválida", variant: "destructive" });
    try {
      await create.mutateAsync({
        contractId, serviceId: serviceId === CUSTOM ? null : serviceId, customName: serviceId === CUSTOM ? customName : null,
        quantity: Number(qty), unitPrice: Number(price), dueDate: due, description, notes, payNow, method, paidAt, reference,
      });
      toast({ title: "Extra lançado", description: payNow ? "Lançado e pago." : "Fica pendente na conta corrente." });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: "Não foi possível lançar", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Lançar serviço extra</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Contrato (ativo ou reservado)</Label>
            <Input placeholder="Pesquisar residente, quarto ou código…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Escolher contrato" /></SelectTrigger>
              <SelectContent>{filtered.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={(v) => {
              setServiceId(v);
              const s = services.find((x) => x.id === v);
              if (s) setPrice(String(s.defaultPrice));
            }}>
              <SelectTrigger><SelectValue placeholder="Escolher serviço" /></SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.active).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                <SelectItem value={CUSTOM}>Personalizado / Outro</SelectItem>
              </SelectContent>
            </Select>
            {serviceId === CUSTOM && (
              <Input className="mt-2" placeholder="Ex.: Substituição de comando do AC" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Quantidade{service ? ` (${service.unitLabel})` : ""}</Label><Input type="number" step="0.5" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
            <div><Label>Preço unitário</Label><Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div><Label>Total</Label><div className="h-10 flex items-center font-display font-semibold">{eur(total)}</div></div>
          </div>
          <div><Label>Data de vencimento</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div><Label>Descrição (opcional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Aparece na conta corrente" /></div>
          <div><Label>Notas internas</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm pt-1"><Switch checked={payNow} onCheckedChange={setPayNow} /> Registar pagamento de imediato</label>
          {payNow && (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
              <div>
                <Label>Método</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(paymentMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></div>
              <div><Label>Referência</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={create.isPending}>{create.isPending ? "A lançar…" : `Lançar ${eur(total)}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ExtraSheet = ({ row, onClose }: { row: ExtraChargeRow | null; onClose: () => void }) => {
  const { data: payments = [] } = useExtraChargePayments(row?.id);
  const pay = useCreateExtraPayment();
  const voidMut = useVoidExtraCharge();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  if (!row) return null;

  const register = async () => {
    const v = Number(amount || row.outstanding);
    if (!(v > 0)) return toast({ title: "Indica o valor", variant: "destructive" });
    try {
      await pay.mutateAsync({ contractId: row.contractId, extraChargeId: row.id, amount: v, paidAt, method, reference });
      toast({ title: "Pagamento registado" });
      setAmount(""); setReference("");
      onClose();
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
  };
  const doVoid = async () => {
    if (!reason.trim()) return toast({ title: "Indica o motivo", variant: "destructive" });
    try {
      await voidMut.mutateAsync({ id: row.id, reason: reason.trim() });
      toast({ title: "Lançamento anulado", description: "Fica no histórico e deixa de contar no saldo." });
      setReason("");
      onClose();
    } catch (e: any) { toast({ title: "Não foi possível anular", description: e?.message, variant: "destructive" }); }
  };

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>{row.name}</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4 text-sm">
          <div className="rounded-xl bg-muted/50 p-4 space-y-1">
            <div>{row.residentName}{row.roomNumber ? ` · Q${row.roomNumber}` : ""}</div>
            <div className="text-muted-foreground">{row.quantity} {row.unitLabel ?? ""} × {eur(row.unitPrice)} · vence {fmt(row.dueDate)}</div>
            {row.description && <div>{row.description}</div>}
            {row.notes && <div className="text-xs text-muted-foreground">Nota interna: {row.notes}</div>}
            <div className="font-display text-xl font-bold pt-1">{eur(row.amount)}</div>
            <div className="text-xs text-muted-foreground">Pago {eur(row.paid)} · em falta {eur(row.outstanding)}</div>
          </div>
          {row.status === "voided" ? (
            <p className="text-destructive">Anulado{row.voidedByName ? ` por ${row.voidedByName}` : ""}: {row.voidReason}</p>
          ) : (
            <>
              {row.outstanding > 0.005 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Registar pagamento</h4>
                  <Input type="number" step="0.01" placeholder={String(row.outstanding)} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                    <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(paymentMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Referência" value={reference} onChange={(e) => setReference(e.target.value)} />
                  <Button className="w-full" onClick={register} disabled={pay.isPending}>Registar pagamento</Button>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-semibold">Anular lançamento</h4>
                <Textarea rows={2} placeholder="Motivo (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Button variant="outline" className="w-full text-destructive" onClick={doVoid} disabled={voidMut.isPending}>Anular lançamento e pagamentos</Button>
              </div>
            </>
          )}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Pagamentos</h4>
              {payments.map((p) => <PaymentEntry key={p.id} payment={p} />)}
            </div>
          )}
          <Link to={`/contratos/${row.contractId}?tab=conta-corrente`} className="inline-flex items-center gap-1 text-primary text-sm">
            Ver conta corrente <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const OtherIncomeSection = () => {
  const { data: rows = [], isLoading } = useExtraCharges();
  const { data: services = [] } = useServiceCatalog();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [service, setService] = useState("all");
  const [state, setState] = useState("all");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prefix = `${ym.y}-${String(ym.m).padStart(2, "0")}`;
  const label = new Date(ym.y, ym.m - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const shift = (d: number) => setYm(({ y, m }) => { const t = new Date(y, m - 1 + d, 1); return { y: t.getFullYear(), m: t.getMonth() + 1 }; });

  const month = rows.filter((r) => r.dueDate.startsWith(prefix));
  const list = month.filter((r) =>
    (service === "all" || r.name === service) &&
    (state === "all" || (state === "voided" ? r.status === "voided" : r.state === state)));
  const totals = useMemo(() => {
    const act = month.filter((r) => r.status === "active");
    return { billed: act.reduce((s, r) => s + r.amount, 0), paid: act.reduce((s, r) => s + r.paid, 0), open: act.reduce((s, r) => s + r.outstanding, 0) };
  }, [month]);
  const names = Array.from(new Set([...services.map((s) => s.name), ...rows.map((r) => r.name)]));
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="font-display text-xl font-semibold min-w-[190px] text-center capitalize">{label}</div>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => shift(1)} aria-label="Mês seguinte"><ChevronRight className="h-4 w-4" /></Button>
        <div className="ml-auto"><Button className="rounded-full" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> Lançar serviço extra</Button></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Lançado", totals.billed, "text-foreground"], ["Recebido", totals.paid, "text-success"], ["Pendente", totals.open, totals.open > 0 ? "text-warning" : "text-muted-foreground"]].map(([l, v, t]) => (
          <div key={l as string} className="rounded-2xl bg-muted/50 px-4 py-5 text-center">
            <span className={`font-display text-2xl font-bold block ${t}`}>{eur(v as number)}</span>
            <span className="text-xs text-muted-foreground">{l as string}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os serviços</SelectItem>{names.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="paid">Pago</SelectItem><SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="due">Por pagar</SelectItem><SelectItem value="overdue">Em atraso</SelectItem>
            <SelectItem value="voided">Anulado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">A carregar…</p> : list.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Sem lançamentos neste mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr className="border-b border-border">
                <th className="p-3">Vencimento</th><th className="p-3">Residente</th><th className="p-3">Serviço</th>
                <th className="p-3 text-right">Total</th><th className="p-3 text-right">Em falta</th><th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <td className="p-3 whitespace-nowrap">{fmt(r.dueDate)}</td>
                  <td className="p-3">{r.residentName}{r.roomNumber ? <span className="text-muted-foreground"> · Q{r.roomNumber}</span> : null}</td>
                  <td className={`p-3 ${r.status === "voided" ? "line-through text-muted-foreground" : ""}`}>
                    {r.name}<span className="text-muted-foreground"> · {r.quantity} × {eur(r.unitPrice)}</span>
                  </td>
                  <td className="p-3 text-right">{eur(r.amount)}</td>
                  <td className="p-3 text-right">{r.status === "voided" ? "—" : eur(r.outstanding)}</td>
                  <td className="p-3">
                    {r.status === "voided" ? <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Anulado</Badge>
                      : r.state ? <PaymentStateBadge state={r.state} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <NewExtraDialog open={creating} onClose={() => setCreating(false)} />
      <ExtraSheet row={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};
