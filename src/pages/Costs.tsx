import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Upload, Loader2, TrendingUp, TrendingDown, Info, AlertTriangle, Receipt, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useLocations } from "@/hooks/useLocations";
import { useCostCategories, useCostInvoices, useUploadCostInvoice, ALLOWED_COST_TYPES, type CostInvoice, type CostStatus } from "@/hooks/useCosts";
import { CostInvoiceSheet } from "@/components/costs/CostInvoiceSheet";
import { categoryDeviations, monthKey, monthlySeries, pctChange, shiftMonth, sumBy, type CostLineFact } from "@/lib/costInsights";

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const eur2 = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v));
const monthName = (k: string, short = false) => {
  const [y, m] = k.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-PT", short ? { month: "short" } : { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-PT") : "—");
const todayKey = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

const CHART = ["hsl(var(--primary))", "hsl(var(--chart-2, 173 58% 39%))", "hsl(var(--chart-3, 197 37% 24%))", "hsl(var(--chart-4, 43 74% 66%))", "hsl(var(--chart-5, 27 87% 67%))", "hsl(var(--muted-foreground))"];

const statusLabel: Record<CostStatus, string> = { to_classify: "Por classificar", classified: "A pagar", paid: "Paga" };
const statusVariant = (s: CostStatus): "secondary" | "outline" | "default" => (s === "paid" ? "default" : s === "classified" ? "outline" : "secondary");

type Filter = { kind: "group" | "location" | "supplier"; value: string } | null;

const Costs = () => {
  const { data: invoices = [], isLoading } = useCostInvoices();
  const { data: categories = [] } = useCostCategories();
  const { data: locations = [] } = useLocations({ excludeRooms: true });
  const upload = useUploadCostInvoice();
  const fileRef = useRef<HTMLInputElement>(null);

  const [month, setMonth] = useState(todayKey());
  const [withVat, setWithVat] = useState(true);
  const [tab, setTab] = useState<"month" | "inbox" | "due">("month");
  const [filter, setFilter] = useState<Filter>(null);
  const [open, setOpen] = useState<{ id: string; auto: boolean } | null>(null);

  const catByCode = useMemo(() => new Map(categories.map((c) => [c.code, c])), [categories]);
  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  const facts: CostLineFact[] = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== "to_classify")
        .flatMap((i) =>
          i.lines.map((l) => {
            const c = l.categoryCode ? catByCode.get(l.categoryCode) : undefined;
            return {
              invoiceId: i.id, invoiceDate: i.invoiceDate, supplierName: i.supplierName,
              categoryCode: l.categoryCode, groupName: c?.groupName ?? "Sem categoria", categoryName: c?.name ?? null,
              kind: c?.kind ?? null, locationId: l.locationId, locationName: l.locationId ? locById.get(l.locationId) ?? "—" : "Geral",
              net: l.net ?? 0, vat: l.vatAmount ?? 0,
            };
          }),
        ),
    [invoices, catByCode, locById],
  );

  const monthFacts = facts.filter((f) => monthKey(f.invoiceDate) === month);
  const filtered = monthFacts.filter((f) =>
    !filter ? true : filter.kind === "group" ? f.groupName === filter.value : filter.kind === "location" ? f.locationName === filter.value : f.supplierName === filter.value,
  );
  const sum = (ls: CostLineFact[]) => ls.reduce((s, l) => s + l.net + (withVat ? l.vat : 0), 0);
  const total = sum(filtered);
  const prevTotal = sum(facts.filter((f) => monthKey(f.invoiceDate) === shiftMonth(month, -1)));
  const change = pctChange(sum(monthFacts), prevTotal);
  const opex = sum(filtered.filter((f) => (f.kind ?? "opex") === "opex"));
  const capex = sum(filtered.filter((f) => f.kind === "capex"));
  const stock = sum(filtered.filter((f) => f.kind === "stock"));

  const series = monthlySeries(facts, month, 6, withVat).map((r) => ({ ...r, label: monthName(r.month, true) }));
  const byGroup = sumBy(filtered, (l) => l.groupName, withVat);
  const byLocation = sumBy(filtered, (l) => l.locationName, withVat).slice(0, 8);
  const bySupplier = sumBy(filtered, (l) => l.supplierName, withVat).slice(0, 5);
  const insights = categoryDeviations(facts, month, withVat).slice(0, 4);

  const unpaid = invoices.filter((i) => i.status === "classified");
  const overdue = unpaid.filter((i) => i.dueDate && i.dueDate < today());
  const unpaidTotal = unpaid.reduce((s, i) => s + (i.totalGross ?? 0), 0);
  const overdueTotal = overdue.reduce((s, i) => s + (i.totalGross ?? 0), 0);
  const inbox = invoices.filter((i) => i.status === "to_classify");

  const monthInvoiceIds = new Set(filtered.map((f) => f.invoiceId));
  const listRows: CostInvoice[] =
    tab === "inbox" ? inbox
    : tab === "due" ? [...unpaid].sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))
    : invoices.filter((i) => monthInvoiceIds.has(i.id));

  const current = open ? invoices.find((i) => i.id === open.id) ?? null : null;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    let lastId: string | null = null;
    let failed = 0;
    for (const file of Array.from(files)) {
      try { lastId = await upload.mutateAsync(file); }
      catch (e: any) { failed++; toast({ title: file.name, description: e?.message ?? "Falhou o carregamento", variant: "destructive" }); }
    }
    if (fileRef.current) fileRef.current.value = "";
    if (lastId && files.length === 1) setOpen({ id: lastId, auto: true });
    else if (files.length > 1) { setTab("inbox"); toast({ title: `${files.length - failed} faturas na caixa de entrada` }); }
  };

  const toggle = (kind: NonNullable<Filter>["kind"], value: string) =>
    setFilter((f) => (f && f.kind === kind && f.value === value ? null : { kind, value }));

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Custos</h1>
          <p className="text-muted-foreground mt-1">Faturas de fornecedores, por mês, categoria e espaço.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="vat" checked={withVat} onCheckedChange={setWithVat} />
            <Label htmlFor="vat" className="text-sm">Com IVA</Label>
          </div>
          <input ref={fileRef} type="file" multiple accept={ALLOWED_COST_TYPES.join(",")} className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Carregar faturas
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-5">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></Button>
        <div className="font-display text-xl font-semibold min-w-[190px] text-center">{monthName(month)}</div>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mês seguinte"><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {filter && (
        <div className="mb-4 flex justify-center">
          <Badge variant="secondary" className="gap-1.5 py-1 px-3 cursor-pointer" onClick={() => setFilter(null)}>
            Filtro: {filter.value} <X className="h-3.5 w-3.5" />
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Custo do mês" value={eur(total)} hint={change == null ? "Sem mês anterior" : `${change > 0 ? "+" : ""}${change}% vs. mês anterior`} tone={change != null && change > 0 ? "warn" : undefined} />
        <Kpi label="Operação (Opex)" value={eur(opex)} hint={`Investimento ${eur(capex)}${stock ? ` · Stock ${eur(stock)}` : ""}`} />
        <Kpi label="A pagar" value={eur(unpaidTotal)} hint={`${unpaid.length} fatura(s)`} onClick={() => setTab("due")} />
        <Kpi label="Vencido" value={eur(overdueTotal)} hint={`${overdue.length} fatura(s)`} tone={overdue.length ? "danger" : undefined} onClick={() => setTab("due")} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 border-border/60 shadow-card lg:col-span-2">
          <div className="text-sm font-medium mb-3">Últimos 6 meses</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} onClick={(e: any) => e?.activePayload?.[0] && setMonth(e.activePayload[0].payload.month)}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} tickFormatter={(v) => `${Math.round(v / 100) / 10}k`} />
                <Tooltip formatter={(v: number, n: string) => [eur(v), n === "opex" ? "Operação" : n === "capex" ? "Investimento" : "Stock"]} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="opex" stackId="a" fill={CHART[0]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="capex" stackId="a" fill={CHART[5]} />
                <Bar dataKey="stock" stackId="a" fill={CHART[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="text-sm font-medium mb-3">Insights</div>
          <div className="space-y-2.5">
            {insights.length === 0 && bySupplier.length === 0 && <p className="text-sm text-muted-foreground">Ainda sem dados suficientes neste mês.</p>}
            {insights.map((i, k) => (
              <div key={k} className="flex gap-2 text-sm">
                {i.tone === "up" ? <TrendingUp className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> : <TrendingDown className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                <span>{i.text}</span>
              </div>
            ))}
            {bySupplier[0] && (
              <div className="flex gap-2 text-sm"><Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>Maior fornecedor do mês: <b>{bySupplier[0].key}</b> ({eur(bySupplier[0].total)})</span>
              </div>
            )}
            {overdue.length > 0 && (
              <div className="flex gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span>{overdue.length} fatura(s) vencida(s) por pagar.</span>
              </div>
            )}
            {inbox.length > 0 && (
              <button className="flex gap-2 text-sm text-left hover:underline" onClick={() => setTab("inbox")}>
                <Receipt className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>{inbox.length} fatura(s) por classificar.</span>
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border-border/60 shadow-card">
          <div className="text-sm font-medium mb-1">Por categoria</div>
          {byGroup.length === 0 ? <Empty /> : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byGroup} dataKey="total" nameKey="key" innerRadius={42} outerRadius={70} paddingAngle={2} onClick={(d: any) => toggle("group", d.key)}>
                      {byGroup.map((_, i) => <Cell key={i} fill={CHART[i % CHART.length]} className="cursor-pointer" />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => eur(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <RankList rows={byGroup} total={sum(filtered)} onPick={(k) => toggle("group", k)} active={filter?.kind === "group" ? filter.value : null} />
            </>
          )}
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="text-sm font-medium mb-3">Por espaço</div>
          {byLocation.length === 0 ? <Empty /> : <RankList rows={byLocation} total={sum(filtered)} onPick={(k) => toggle("location", k)} active={filter?.kind === "location" ? filter.value : null} bars />}
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="text-sm font-medium mb-3">Top fornecedores</div>
          {bySupplier.length === 0 ? <Empty /> : <RankList rows={bySupplier} total={sum(filtered)} onPick={(k) => toggle("supplier", k)} active={filter?.kind === "supplier" ? filter.value : null} bars />}
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-3">
        <TabsList>
          <TabsTrigger value="month">Faturas do mês</TabsTrigger>
          <TabsTrigger value="inbox">Por classificar{inbox.length ? ` (${inbox.length})` : ""}</TabsTrigger>
          <TabsTrigger value="due">A pagar{unpaid.length ? ` (${unpaid.length})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/60 shadow-card overflow-hidden">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">A carregar…</p>
        : listRows.length === 0 ? <p className="p-6 text-sm text-muted-foreground text-center">Sem faturas aqui.</p>
        : (
          <div className="divide-y divide-border">
            {listRows.map((i) => {
              const late = i.status === "classified" && i.dueDate && i.dueDate < today();
              return (
                <button key={i.id} onClick={() => setOpen({ id: i.id, auto: false })} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-smooth">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{i.supplierName || i.fileName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.invoiceNumber || "Sem número"} · {fmtDate(i.invoiceDate)}
                      {i.lines[0]?.categoryCode ? ` · ${catByCode.get(i.lines[0].categoryCode)?.name ?? ""}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{eur2(i.totalGross)}</div>
                    <div className={late ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                      {i.status === "classified" ? `Vence ${fmtDate(i.dueDate)}` : i.status === "paid" ? `Paga ${fmtDate(i.paidAt)}` : ""}
                    </div>
                  </div>
                  <Badge variant={late ? "destructive" : statusVariant(i.status)} className="hidden sm:inline-flex">{late ? "Vencida" : statusLabel[i.status]}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <CostInvoiceSheet invoice={current} autoExtract={open?.auto} onClose={() => setOpen(null)} />
    </div>
  );
};

const Empty = () => <p className="text-sm text-muted-foreground py-6 text-center">Sem custos classificados.</p>;

const Kpi = ({ label, value, hint, tone, onClick }: { label: string; value: string; hint?: string; tone?: "warn" | "danger"; onClick?: () => void }) => (
  <Card onClick={onClick} className={`p-3 sm:p-4 border-border/60 shadow-card min-w-0 ${onClick ? "cursor-pointer hover:bg-muted/30 transition-smooth" : ""}`}>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className={`font-display text-lg sm:text-2xl font-semibold whitespace-nowrap ${tone === "danger" ? "text-destructive" : ""}`}>{value}</div>
    {hint && <div className={`text-[11px] mt-0.5 ${tone ? "text-destructive" : "text-muted-foreground"}`}>{hint}</div>}
  </Card>
);

const RankList = ({ rows, total, onPick, active, bars }: { rows: { key: string; total: number }[]; total: number; onPick: (k: string) => void; active: string | null; bars?: boolean }) => (
  <div className="space-y-1.5">
    {rows.map((r, i) => {
      const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
      return (
        <button key={r.key} onClick={() => onPick(r.key)} className={`w-full text-left rounded-md px-2 py-1.5 transition-smooth ${active === r.key ? "bg-accent" : "hover:bg-muted/50"}`}>
          <div className="flex items-center gap-2 text-sm">
            {!bars && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART[i % CHART.length] }} />}
            <span className="flex-1 truncate">{r.key}</span>
            <span className="text-muted-foreground text-xs">{pct}%</span>
            <span className="font-medium">{eur(r.total)}</span>
          </div>
          {bars && <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div>}
        </button>
      );
    })}
  </div>
);

export default Costs;
