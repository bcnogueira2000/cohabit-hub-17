import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, BedDouble, TrendingDown, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContracts, useStaysByContract } from "@/hooks/useContracts";
import { useTypologyPricing } from "@/hooks/usePricing";
import { ContractStatusBadge, contractStatusLabels } from "@/components/contracts/ContractStatusBadge";
import { NewContractDialog } from "@/components/contracts/NewContractDialog";
import { EndTransitionalRentDialog } from "@/components/contracts/EndTransitionalRentDialog";
import { useRooms } from "@/hooks/useData";


const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Contracts = () => {
  const navigate = useNavigate();
  const { data: contracts = [], isLoading } = useContracts();
  const { data: stayByContract = {} } = useStaysByContract();
  const { data: pricing = [] } = useTypologyPricing();
  const { data: rooms = [] } = useRooms();

  const [status, setStatus] = useState<string>("all");
  const [typology, setTypology] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transitionalOpen, setTransitionalOpen] = useState(false);

  const typologies = useMemo(
    () => Array.from(new Set(rooms.map((r) => String(r.typology)).filter(Boolean))).sort() as string[],
    [rooms]
  );

  const transitionalContracts = useMemo(
    () =>
      contracts.filter(
        (c) => c.regularRentAmount != null && c.status !== "cancelled" && c.status !== "terminated"
      ),
    [contracts]
  );

  const roomOf = (contractId: string) => {
    const roomId = stayByContract[contractId]?.roomId;
    return roomId ? rooms.find((r) => r.id === roomId) ?? null : null;
  };

  const filtered = contracts.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (typology !== "all" && roomOf(c.id)?.typology !== typology) return false;
    if (from && c.endDate < from) return false;
    if (to && c.startDate > to) return false;
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);

  /** contratos não cancelados que cobrem hoje (ocupação vem das DATAS) */
  const activeByDates = useMemo(
    () =>
      contracts.filter((c) => {
        if (c.status === "cancelled") return false;
        const end = c.actualEndDate ?? c.endDate;
        return c.startDate <= today && end >= today;
      }),
    [contracts, today]
  );

  /** quartos ocupados por contratos a decorrer hoje */
  const occupiedByContract = useMemo(() => {
    const set = new Set<string>();
    for (const c of activeByDates) {
      const roomId = stayByContract[c.id]?.roomId;
      if (roomId) set.add(roomId);
    }
    return set;
  }, [activeByDates, stayByContract]);

  const occupancy = useMemo(() => {
    if (rooms.length === 0) return 0;
    return Math.round((occupiedByContract.size / rooms.length) * 100);
  }, [rooms, occupiedByContract]);

  /** perda mensal estimada: preço promocional (ou de tabela) dos quartos sem contrato a decorrer */
  const vacancyLoss = useMemo(() => {
    const priceByName = new Map<string, number>();
    for (const t of pricing) {
      const p = t.current;
      if (!p) continue;
      priceByName.set(t.name.toLowerCase(), p.promoPrice ?? p.listPrice);
    }
    let loss = 0;
    let count = 0;
    for (const r of rooms) {
      if (occupiedByContract.has(r.id)) continue;
      count += 1;
      loss += priceByName.get(String(r.typology).toLowerCase()) ?? 0;
    }
    return { loss, count };
  }, [rooms, pricing, occupiedByContract]);

  const endingSoon = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const limitStr = limit.toISOString().slice(0, 10);
    return contracts.filter((c) => {
      if (c.status === "cancelled") return false;
      const end = c.actualEndDate ?? c.endDate;
      return end >= today && end <= limitStr;
    }).length;
  }, [contracts, today]);


  return (
    <div className="px-4 lg:px-10 2xl:px-14 py-6 lg:py-10 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            {contracts.length} contrato{contracts.length === 1 ? "" : "s"} registado{contracts.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {transitionalContracts.length > 0 && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setTransitionalOpen(true)}
            >
              <CalendarClock className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Terminar Período
              Transitório
            </Button>
          )}
          <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Novo contrato
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BedDouble className="h-4 w-4" strokeWidth={1.5} /> Ocupação
          </div>
          <div className="font-display text-2xl font-semibold">{occupancy}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {occupiedByContract.size}/{rooms.length} quartos
          </div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingDown className="h-4 w-4" strokeWidth={1.5} /> Perda por vacância (mês)
          </div>
          <div className="font-display text-2xl font-semibold text-destructive">{eur(vacancyLoss.loss)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {vacancyLoss.count} quarto{vacancyLoss.count === 1 ? "" : "s"} sem contrato ativo
          </div>
        </Card>
        <Card className="p-4 border-border/60 shadow-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <CalendarClock className="h-4 w-4" strokeWidth={1.5} /> A terminar em 30 dias
          </div>
          <div className="font-display text-2xl font-semibold">{endingSoon}</div>
          <div className="text-xs text-muted-foreground mt-0.5">contratos ativos</div>
        </Card>
      </div>


      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2 mb-5">
        <div>
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[170px] rounded-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {Object.entries(contractStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tipologia</Label>
          <Select value={typology} onValueChange={setTypology}>
            <SelectTrigger className="w-[170px] rounded-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tipologias</SelectItem>
              {typologies.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-[160px] rounded-full" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-[160px] rounded-full" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-border/60">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
          <p className="font-medium">Sem contratos</p>
          <p className="text-sm text-muted-foreground mt-1">Cria o primeiro contrato para começar.</p>
        </Card>
      ) : (
        <Card className="border-border/60 shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Residente</th>
                <th className="px-4 py-3 font-medium">Quarto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Fim</th>
                <th className="px-4 py-3 font-medium text-right">Renda atual</th>
                <th className="px-4 py-3 font-medium text-right">Em dívida</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const room = roomOf(c.id);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-smooth cursor-pointer"
                    onClick={() => navigate(`/finance/contracts/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/residents/${c.residentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium hover:underline"
                      >
                        {c.residentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {room ? (
                        <Link
                          to={`/rooms/${room.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {room.number}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><ContractStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.actualEndDate ?? c.endDate)}</td>
                    <td className="px-4 py-3 text-right">{eur(c.currentRent)}</td>
                    <td className={`px-4 py-3 text-right ${(c.balance?.overdue ?? 0) > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {eur(c.balance?.overdue ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <EndTransitionalRentDialog
        open={transitionalOpen}
        onOpenChange={setTransitionalOpen}
        contracts={transitionalContracts}
        roomLabel={(id) => roomOf(id)?.number ?? "—"}
      />

      <NewContractDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={({ contractId }) => navigate(`/finance/contracts/${contractId}`)}
      />
    </div>
  );
};

export default Contracts;
