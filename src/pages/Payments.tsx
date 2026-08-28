import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Wallet,
  FileText,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { PaymentStateBadge } from "@/components/payments/PaymentStateBadge";
import {
  paymentMethodLabels,
  paymentStateLabels,
  useChargePayments,
  useCreatePayment,
  useCreateDepositReturn,
  useCreateDepositReceipt,
  useDeposits,
  useDepositsToReceive,
  useDepositPayments,
  useReservationFees,
  useBookingFeePayments,
  useCreateBookingFeePayment,
  useRentMonth,
  useTypologies,
  type DepositRow,
  type ReservationFeeRow,
  type PaymentMethod,
  type PaymentState,
  type RentChargeRow,
} from "@/hooks/usePayments";
import { useIssueMoloniDocument, useMoloniDocumentPdf, useSyncMoloniPayments } from "@/hooks/useMoloni";



const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const monthLabel = (year: number, month: number) => {
  const s = new Date(year, month - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const todayISO = () => new Date().toISOString().slice(0, 10);

const downloadCsv = (rows: RentChargeRow[], year: number, month: number) => {
  const header = [
    "Residente",
    "Quarto",
    "Tipologia",
    "Vencimento",
    "Valor",
    "Pago",
    "Em falta",
    "Estado",
    "Contrato",
  ];
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(";"),
    ...rows.map((r) =>
      [
        r.residentName,
        r.roomNumber ?? "",
        r.typologyName ?? "",
        r.dueDate ?? "",
        r.amount.toFixed(2).replace(".", ","),
        r.paid.toFixed(2).replace(".", ","),
        Math.max(r.outstanding, 0).toFixed(2).replace(".", ","),
        paymentStateLabels[r.state],
        r.contractId,
      ]
        .map(esc)
        .join(";")
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rendas-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const Payments = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [state, setState] = useState<string>("all");
  const [typology, setTypology] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: charges = [], isLoading } = useRentMonth(year, month);
  const { data: typologies = [] } = useTypologies();
  const syncMoloniPayments = useSyncMoloniPayments();

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const filtered = useMemo(
    () =>
      charges.filter((r) => {
        if (state !== "all" && r.state !== state) return false;
        if (typology !== "all" && r.typologyId !== typology) return false;
        return true;
      }),
    [charges, state, typology]
  );

  const totals = useMemo(
    () => ({
      billed: filtered.reduce((a, r) => a + r.amount, 0),
      paid: filtered.reduce((a, r) => a + r.paid, 0),
      outstanding: filtered.reduce((a, r) => a + Math.max(r.outstanding, 0), 0),
    }),
    [filtered]
  );

  const selected = filtered.find((r) => r.id === selectedId) ?? charges.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="px-4 lg:px-10 2xl:px-14 py-6 lg:py-10 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Rendas</h1>
          <p className="text-muted-foreground mt-1">Mapa mensal de rendas, pagamentos e cauções.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => syncMoloniPayments.mutate(undefined)}
            disabled={syncMoloniPayments.isPending}
          >
            {syncMoloniPayments.isPending ? "A importar…" : "Importar pagamentos (Moloni)"}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => downloadCsv(filtered, year, month)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rent" className="space-y-6">
        <TabsList className="rounded-full">
          <TabsTrigger value="rent" className="rounded-full">Rendas</TabsTrigger>
          <TabsTrigger value="deposits" className="rounded-full">Cauções</TabsTrigger>
          <TabsTrigger value="reservation" className="rounded-full">Taxa de Reserva</TabsTrigger>
        </TabsList>

        <TabsContent value="rent" className="mt-0">
      {/* Seletor de mês */}

      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div className="font-display text-xl font-semibold min-w-[190px] text-center">
          {monthLabel(year, month)}
        </div>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => shiftMonth(1)} aria-label="Mês seguinte">
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        {(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => {
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
            }}
          >
            Mês atual
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Faturado
          </div>
          <div className="font-display text-2xl font-semibold">{eur(totals.billed)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" strokeWidth={1.5} /> Recebido
          </div>
          <div className="font-display text-2xl font-semibold text-success">{eur(totals.paid)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} /> Em falta
          </div>
          <div className="font-display text-2xl font-semibold text-destructive">{eur(totals.outstanding)}</div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2 mb-5">
        <div>
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-[180px] rounded-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {(Object.keys(paymentStateLabels) as PaymentState[]).map((k) => (
                <SelectItem key={k} value={k}>{paymentStateLabels[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tipologia</Label>
          <Select value={typology} onValueChange={setTypology}>
            <SelectTrigger className="w-[180px] rounded-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tipologias</SelectItem>
              {typologies.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem rendas para {monthLabel(year, month)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            As rendas são geradas a partir dos contratos ativos.
          </p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Residente</th>
                <th className="px-4 py-3 font-medium">Quarto</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium text-right">Renda</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Pago</th>
                <th className="px-4 py-3 font-medium text-right">Em falta</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth cursor-pointer"
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="px-4 py-3">
                    {r.residentId ? (
                      <Link
                        to={`/residents/${r.residentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {r.residentName}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.residentName}</span>
                    )}
                    {r.prorated && (
                      <span className="ml-2 text-[11px] text-muted-foreground">proporcional</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.roomId ? (
                      <Link
                        to={`/rooms/${r.roomId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {r.roomNumber}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {r.typologyName && (
                      <span className="ml-2 text-[11px] text-muted-foreground">{r.typologyName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.dueDate)}</td>
                  <td className="px-4 py-3 text-right">{eur(r.amount)}</td>
                  <td className="px-4 py-3"><PaymentStateBadge state={r.state} /></td>
                  <td className="px-4 py-3 text-right text-success">{eur(r.paid)}</td>
                  <td
                    className={`px-4 py-3 text-right ${
                      r.outstanding > 0.005 ? "text-destructive font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {eur(Math.max(r.outstanding, 0))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/finance/contracts/${r.contractId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Contrato <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="deposits" className="mt-0">
          <DepositsSection />
        </TabsContent>

        <TabsContent value="reservation" className="mt-0">
          <ReservationFeesSection />
        </TabsContent>
      </Tabs>

      <PaymentSheet charge={selected} onClose={() => setSelectedId(null)} />
    </div>

  );
};

const PaymentSheet = ({ charge, onClose }: { charge: RentChargeRow | null; onClose: () => void }) => {
  const create = useCreatePayment();
  const { data: payments = [] } = useChargePayments(charge?.id);
  const issue = useIssueMoloniDocument();
  const pdf = useMoloniDocumentPdf();
  const syncPayments = useSyncMoloniPayments();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");

  const reset = () => {
    setAmount("");
    setPaidAt(todayISO());
    setMethod("transfer");
    setReference("");
  };

  const submit = async () => {
    if (!charge) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Valor inválido", description: "Indica um valor superior a zero.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        contractId: charge.contractId,
        rentChargeId: charge.id,
        amount: value,
        paidAt,
        method,
        reference,
      });
      toast({ title: "Pagamento registado" });
      reset();
    } catch (e: any) {
      toast({ title: "Erro ao registar pagamento", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={!!charge}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {charge && (
          <>
            <SheetHeader>
              <div className="mb-2"><PaymentStateBadge state={charge.state} /></div>
              <SheetTitle className="font-display text-2xl">{charge.residentName}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Renda</div>
                <div className="font-medium">{eur(charge.amount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pago</div>
                <div className="font-medium text-success">{eur(charge.paid)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Em falta</div>
                <div className="font-medium text-destructive">{eur(Math.max(charge.outstanding, 0))}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {monthLabel(charge.year, charge.month)} · vencimento {fmtDate(charge.dueDate)}
              {charge.roomNumber ? ` · quarto ${charge.roomNumber}` : ""}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Registar pagamento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor (€)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder={Math.max(charge.outstanding, 0).toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input type="date" className="mt-1" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Método</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((k) => (
                        <SelectItem key={k} value={k}>{paymentMethodLabels[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Referência</Label>
                  <Input
                    className="mt-1"
                    placeholder="Opcional"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="rounded-full" onClick={submit} disabled={create.isPending}>
                  {create.isPending ? "A registar…" : "Registar pagamento"}
                </Button>
                {Math.max(charge.outstanding, 0) > 0 && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setAmount(Math.max(charge.outstanding, 0).toFixed(2))}
                  >
                    Valor em falta
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Podes registar vários pagamentos parciais — o estado atualiza-se automaticamente.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2">Pagamentos registados</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem pagamentos.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{eur(Number(p.amount))}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(p.paid_at)}
                          {p.method ? ` · ${paymentMethodLabels[p.method as PaymentMethod]}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2">Faturação Moloni</h3>
              {charge.moloniDocumentId ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    Documento{" "}
                    <span className="font-mono">{charge.moloniDocumentNumber ?? `#${charge.moloniDocumentId}`}</span>
                    {charge.moloniStatus === "paid" && (
                      <span className="ml-2 text-xs text-success">pago no Moloni</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => pdf.mutate(charge.id)}
                      disabled={pdf.isPending}
                    >
                      Abrir PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => syncPayments.mutate(charge.id)}
                      disabled={syncPayments.isPending}
                    >
                      Verificar pagamento
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Ainda sem documento emitido para esta renda.</p>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => issue.mutate(charge.id)}
                    disabled={issue.isPending}
                  >
                    {issue.isPending ? "A emitir…" : "Emitir no Moloni"}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link
                to={`/finance/contracts/${charge.contractId}`}
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                Ver contrato <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ============ Cauções ============

const statusLabels: Record<string, string> = {
  reserved: "Reservado",
  active: "Ativo",
  terminated: "Terminado",
  cancelled: "Cancelado",
};

const DepositsSection = () => {
  const { data: deposits = [], isLoading } = useDeposits();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deposits.find((d) => d.contractId === selectedId) ?? null;

  const totals = useMemo(
    () => ({
      received: deposits.reduce((a, d) => a + d.depositReceived, 0),
      returned: deposits.reduce((a, d) => a + d.depositReturned, 0),
      held: deposits.reduce((a, d) => a + d.depositHeld, 0),
    }),
    [deposits]
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" strokeWidth={1.5} /> Recebido
          </div>
          <div className="font-display text-2xl font-semibold">{eur(totals.received)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Devolvido
          </div>
          <div className="font-display text-2xl font-semibold text-success">{eur(totals.returned)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <PiggyBank className="h-4 w-4" strokeWidth={1.5} /> Retido
          </div>
          <div className="font-display text-2xl font-semibold">{eur(totals.held)}</div>
        </Card>
      </div>

      <DepositsToReceiveSection />

      <h2 className="font-display text-xl font-semibold mb-3">Por devolver</h2>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : deposits.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <PiggyBank className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem cauções por devolver</p>
          <p className="text-sm text-muted-foreground mt-1">
            Aparecem aqui os contratos cuja caução recebida ainda não foi devolvida.
          </p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Residente</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium text-right">Recebido</th>
                <th className="px-4 py-3 font-medium text-right">Devolvido</th>
                <th className="px-4 py-3 font-medium text-right">Retido</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.contractId} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth">
                  <td className="px-4 py-3">
                    {d.residentId ? (
                      <Link to={`/residents/${d.residentId}`} className="font-medium hover:underline">
                        {d.residentName}
                      </Link>
                    ) : (
                      <span className="font-medium">{d.residentName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/finance/contracts/${d.contractId}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {fmtDate(d.startDate)} – {fmtDate(d.endDate)}
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                    <Badge variant="secondary" className="ml-2 rounded-full text-[11px]">
                      {statusLabels[d.status] ?? d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{eur(d.depositReceived)}</td>
                  <td className="px-4 py-3 text-right text-success">{eur(d.depositReturned)}</td>
                  <td className="px-4 py-3 text-right font-medium">{eur(d.depositHeld)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSelectedId(d.contractId)}>
                      Registar devolução
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <DepositReturnSheet deposit={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

const DepositReturnSheet = ({ deposit, onClose }: { deposit: DepositRow | null; onClose: () => void }) => {
  const create = useCreateDepositReturn();
  const { data: movements = [] } = useDepositPayments(deposit?.contractId);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");

  const reset = () => {
    setAmount("");
    setPaidAt(todayISO());
    setMethod("transfer");
    setReference("");
  };

  const submit = async () => {
    if (!deposit) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Valor inválido", description: "Indica um valor superior a zero.", variant: "destructive" });
      return;
    }
    if (value > deposit.depositHeld + 0.005) {
      toast({
        title: "Valor superior ao retido",
        description: `Só há ${eur(deposit.depositHeld)} por devolver.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await create.mutateAsync({
        contractId: deposit.contractId,
        amount: value,
        paidAt,
        method,
        reference,
        currentReturned: deposit.depositReturned,
      });
      toast({ title: "Devolução registada" });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao registar devolução", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={!!deposit}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {deposit && (
          <>
            <SheetHeader>
              <div className="mb-2">
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  {statusLabels[deposit.status] ?? deposit.status}
                </Badge>
              </div>
              <SheetTitle className="font-display text-2xl">{deposit.residentName}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Recebido</div>
                <div className="font-medium">{eur(deposit.depositReceived)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Devolvido</div>
                <div className="font-medium text-success">{eur(deposit.depositReturned)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Retido</div>
                <div className="font-medium">{eur(deposit.depositHeld)}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Registar devolução</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor a devolver (€)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder={deposit.depositHeld.toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input type="date" className="mt-1" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Método</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((k) => (
                        <SelectItem key={k} value={k}>{paymentMethodLabels[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Referência</Label>
                  <Input
                    className="mt-1"
                    placeholder="Opcional"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="rounded-full" onClick={submit} disabled={create.isPending}>
                  {create.isPending ? "A registar…" : "Registar devolução"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setAmount(deposit.depositHeld.toFixed(2))}
                >
                  Valor retido
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Devoluções parciais são somadas ao total já devolvido.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2">Movimentos de caução</h3>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem movimentos registados.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {p.kind === "deposit_return" ? "− " : "+ "}
                          {eur(Number(p.amount))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(p.paid_at)}
                          {p.method ? ` · ${paymentMethodLabels[p.method as PaymentMethod]}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.kind === "deposit_return" ? "Devolução" : "Caução"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link to={`/finance/contracts/${deposit.contractId}`} className="inline-flex items-center gap-1 text-sm hover:underline">
                Ver contrato <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ============ Cauções por receber ============

const DepositsToReceiveSection = () => {
  const { data: pending = [], isLoading } = useDepositsToReceive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pending.find((d) => d.contractId === selectedId) ?? null;

  const totalPending = useMemo(
    () => pending.reduce((a, d) => a + (d.depositDue - d.depositReceived), 0),
    [pending]
  );

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-xl font-semibold">Por receber</h2>
        {pending.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {pending.length} {pending.length === 1 ? "contrato" : "contratos"} ·{" "}
            <span className="text-destructive font-medium">{eur(totalPending)}</span> em falta
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : pending.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-border/60">
          <PiggyBank className="h-8 w-8 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem cauções por receber</p>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os contratos com caução definida já a receberam por completo.
          </p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Residente</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium text-right">Devido</th>
                <th className="px-4 py-3 font-medium text-right">Recebido</th>
                <th className="px-4 py-3 font-medium text-right">Em falta</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pending.map((d) => (
                <tr key={d.contractId} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth">
                  <td className="px-4 py-3">
                    {d.residentId ? (
                      <Link to={`/residents/${d.residentId}`} className="font-medium hover:underline">
                        {d.residentName}
                      </Link>
                    ) : (
                      <span className="font-medium">{d.residentName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/finance/contracts/${d.contractId}`}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {fmtDate(d.startDate)} – {fmtDate(d.endDate)}
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                    <Badge variant="secondary" className="ml-2 rounded-full text-[11px]">
                      {statusLabels[d.status] ?? d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{eur(d.depositDue)}</td>
                  <td className="px-4 py-3 text-right text-success">{eur(d.depositReceived)}</td>
                  <td className="px-4 py-3 text-right font-medium text-destructive">
                    {eur(d.depositDue - d.depositReceived)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSelectedId(d.contractId)}>
                      Registar recebimento
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <DepositReceiptSheet deposit={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

const DepositReceiptSheet = ({ deposit, onClose }: { deposit: DepositRow | null; onClose: () => void }) => {
  const create = useCreateDepositReceipt();
  const { data: movements = [] } = useDepositPayments(deposit?.contractId);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");

  const missing = deposit ? deposit.depositDue - deposit.depositReceived : 0;

  const reset = () => {
    setAmount("");
    setPaidAt(todayISO());
    setMethod("transfer");
    setReference("");
  };

  const submit = async () => {
    if (!deposit) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Valor inválido", description: "Indica um valor superior a zero.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        contractId: deposit.contractId,
        amount: value,
        paidAt,
        method,
        reference,
        currentReceived: deposit.depositReceived,
      });
      toast({ title: "Recebimento registado" });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao registar recebimento", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={!!deposit}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {deposit && (
          <>
            <SheetHeader>
              <div className="mb-2">
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  {statusLabels[deposit.status] ?? deposit.status}
                </Badge>
              </div>
              <SheetTitle className="font-display text-2xl">{deposit.residentName}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Devido</div>
                <div className="font-medium">{eur(deposit.depositDue)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Recebido</div>
                <div className="font-medium text-success">{eur(deposit.depositReceived)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Em falta</div>
                <div className="font-medium text-destructive">{eur(missing)}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-display text-lg font-semibold">Registar recebimento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor recebido (€)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    placeholder={missing.toFixed(2)}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data</Label>
                  <Input type="date" className="mt-1" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Método</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((k) => (
                        <SelectItem key={k} value={k}>{paymentMethodLabels[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Referência</Label>
                  <Input
                    className="mt-1"
                    placeholder="Opcional"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button className="rounded-full" onClick={submit} disabled={create.isPending}>
                  {create.isPending ? "A registar…" : "Registar recebimento"}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setAmount(missing.toFixed(2))}>
                  Valor em falta
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recebimentos parciais são somados ao total já recebido.
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2">Movimentos de caução</h3>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem movimentos registados.</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {p.kind === "deposit_return" ? "− " : "+ "}
                          {eur(Number(p.amount))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(p.paid_at)}
                          {p.method ? ` · ${paymentMethodLabels[p.method as PaymentMethod]}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.kind === "deposit_return" ? "Devolução" : "Caução"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link to={`/finance/contracts/${deposit.contractId}`} className="inline-flex items-center gap-1 text-sm hover:underline">
                Ver contrato <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ============ Taxa de reserva ============

const ReservationFeesSection = () => {
  const { data: fees = [], isLoading } = useReservationFees();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = fees.find((f) => f.contractId === selectedId) ?? null;

  const totals = useMemo(
    () => ({
      expected: fees.reduce((a, f) => a + f.feeAmount, 0),
      received: fees.reduce((a, f) => a + f.received, 0),
      outstanding: fees.reduce((a, f) => a + Math.max(f.outstanding, 0), 0),
    }),
    [fees]
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} /> Previsto
          </div>
          <div className="font-display text-2xl font-semibold">{eur(totals.expected)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" strokeWidth={1.5} /> Recebido
          </div>
          <div className="font-display text-2xl font-semibold text-success">{eur(totals.received)}</div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} /> Em falta
          </div>
          <div className="font-display text-2xl font-semibold text-destructive">{eur(totals.outstanding)}</div>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : fees.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem taxas de reserva</p>
          <p className="text-sm text-muted-foreground mt-1">
            Aparecem aqui os contratos com taxa de reserva definida.
          </p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Residente</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Prazo</th>
                <th className="px-4 py-3 font-medium text-right">Taxa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Recebido</th>
                <th className="px-4 py-3 font-medium text-right">Em falta</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const missing = Math.max(f.outstanding, 0);
                return (
                  <tr key={f.contractId} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth">
                    <td className="px-4 py-3">
                      {f.residentId ? (
                        <Link to={`/residents/${f.residentId}`} className="font-medium hover:underline">
                          {f.residentName}
                        </Link>
                      ) : (
                        <span className="font-medium">{f.residentName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/finance/contracts/${f.contractId}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {fmtDate(f.startDate)} – {fmtDate(f.endDate)}
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </Link>
                      <Badge variant="secondary" className="ml-2 rounded-full text-[11px]">
                        {statusLabels[f.status] ?? f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(f.deadline)}</td>
                    <td className="px-4 py-3 text-right">{eur(f.feeAmount)}</td>
                    <td className="px-4 py-3">
                      <PaymentStateBadge state={missing < 0.005 ? "paid" : f.received > 0.005 ? "partial" : "due"} />
                    </td>
                    <td className="px-4 py-3 text-right text-success">{eur(f.received)}</td>
                    <td
                      className={`px-4 py-3 text-right ${
                        missing > 0.005 ? "text-destructive font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {eur(missing)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSelectedId(f.contractId)}>
                        {missing > 0.005 ? "Registar recebimento" : "Ver"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ReservationFeeSheet fee={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

const ReservationFeeSheet = ({ fee, onClose }: { fee: ReservationFeeRow | null; onClose: () => void }) => {
  const create = useCreateBookingFeePayment();
  const { data: payments = [] } = useBookingFeePayments(fee?.contractId);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("transfer");
  const [reference, setReference] = useState("");

  const missing = fee ? Math.max(fee.outstanding, 0) : 0;

  const reset = () => {
    setAmount("");
    setPaidAt(todayISO());
    setMethod("transfer");
    setReference("");
  };

  const submit = async () => {
    if (!fee) return;
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Valor inválido", description: "Indica um valor superior a zero.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        contractId: fee.contractId,
        amount: value,
        paidAt,
        method,
        reference,
      });
      toast({ title: "Taxa de reserva registada" });
      reset();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro ao registar pagamento", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Sheet
      open={!!fee}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {fee && (
          <>
            <SheetHeader>
              <div className="mb-2">
                <PaymentStateBadge state={missing < 0.005 ? "paid" : fee.received > 0.005 ? "partial" : "due"} />
              </div>
              <SheetTitle className="font-display text-2xl">{fee.residentName}</SheetTitle>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Taxa</div>
                <div className="font-medium">{eur(fee.feeAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Recebido</div>
                <div className="font-medium text-success">{eur(fee.received)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Em falta</div>
                <div className="font-medium text-destructive">{eur(missing)}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Prazo de reserva: {fmtDate(fee.deadline)}
            </div>

            {missing > 0.005 && (
              <div className="mt-6 space-y-3">
                <h3 className="font-display text-lg font-semibold">Registar recebimento</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor (€)</Label>
                    <Input
                      className="mt-1"
                      inputMode="decimal"
                      placeholder={missing.toFixed(2)}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <Input type="date" className="mt-1" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Método</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((k) => (
                          <SelectItem key={k} value={k}>{paymentMethodLabels[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Referência</Label>
                    <Input
                      className="mt-1"
                      placeholder="Opcional"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="rounded-full" onClick={submit} disabled={create.isPending}>
                    {create.isPending ? "A registar…" : "Registar recebimento"}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => setAmount(missing.toFixed(2))}>
                    Valor em falta
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-display text-lg font-semibold mb-2">Pagamentos registados</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem pagamentos.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{eur(Number(p.amount))}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(p.paid_at)}
                          {p.method ? ` · ${paymentMethodLabels[p.method as PaymentMethod]}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">Taxa de reserva</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link to={`/finance/contracts/${fee.contractId}`} className="inline-flex items-center gap-1 text-sm hover:underline">
                Ver contrato <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default Payments;

