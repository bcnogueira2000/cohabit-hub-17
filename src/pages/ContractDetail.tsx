import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarRange, LogIn, LogOut, Repeat, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useContract, useContractStays } from "@/hooks/useContracts";
import { ContractStatusBadge } from "@/components/contracts/ContractStatusBadge";
import { useRooms } from "@/hooks/useData";
import { RentPeriodsSection } from "@/components/contracts/RentPeriodsSection";

const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <span className="text-muted-foreground text-xs block mb-0.5">{label}</span>
    <div className="text-sm">{children}</div>
  </div>
);

const ContractDetail = () => {
  const { id } = useParams();
  const { data: contract, isLoading } = useContract(id);
  const { data: stays = [] } = useContractStays(id);
  const { data: rooms = [] } = useRooms();

  if (isLoading) return <div className="p-10"><p className="text-muted-foreground text-sm">A carregar…</p></div>;
  if (!contract) {
    return (
      <div className="p-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Contrato não encontrado.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/contracts"><ArrowLeft className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/contracts"><ArrowLeft className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Contratos</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="mb-1"><ContractStatusBadge status={contract.status} /></div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">
            <Link to={`/residents/${contract.residentId}`} className="hover:underline">
              {contract.residentName}
            </Link>
          </h1>
          <p className="text-muted-foreground mt-1">
            {fmtDate(contract.startDate)} → {fmtDate(contract.actualEndDate ?? contract.endDate)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground block">Renda atual</span>
          <span className="font-display text-2xl font-semibold">{eur(contract.currentRent)}</span>
        </div>
      </div>

      <Card className="p-5 border-border/60 shadow-card mb-3">
        <h3 className="font-display text-lg font-semibold mb-3">Dados do contrato</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Residente">
            <Link to={`/residents/${contract.residentId}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <User className="h-4 w-4" strokeWidth={1.5} /> {contract.residentName}
            </Link>
          </Field>
          <Field label="Início">{fmtDate(contract.startDate)}</Field>
          <Field label="Fim">{fmtDate(contract.endDate)}</Field>
          {contract.actualEndDate && <Field label="Fim efetivo">{fmtDate(contract.actualEndDate)}</Field>}
          <Field label="Dia de vencimento">
            <span className="flex items-center gap-1.5"><CalendarRange className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} /> Dia {contract.paymentDay}</span>
          </Field>
          <Field label="Renovação automática">
            <span className="flex items-center gap-1.5">
              <Repeat className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              {contract.autoRenew ? "Sim" : "Não"}
            </span>
          </Field>
        </div>

        <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-4 gap-4">
          <Field label="Caução devida">{eur(contract.depositDue)}</Field>
          <Field label="Caução recebida">{eur(contract.depositReceived)}</Field>
          <Field label="Caução devolvida">{eur(contract.depositReturned)}</Field>
          <Field label="Caução retida">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              {eur(contract.balance?.depositHeld ?? contract.depositReceived - contract.depositReturned)}
            </span>
          </Field>
        </div>

        {contract.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground text-xs block mb-1">Notas</span>
            <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </Card>

      <RentPeriodsSection
        contractId={contract.id}
        startDate={contract.startDate}
        periods={contract.rentPeriods}
      />

      <Card className="p-5 border-border/60 shadow-card">
        <h3 className="font-display text-lg font-semibold mb-3">Estadias ({stays.length})</h3>
        {stays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem estadias ligadas a este contrato.</p>
        ) : (
          <div className="space-y-2">
            {stays.map((s: any) => {
              const room = rooms.find((r) => r.id === s.room_id);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {room ? (
                        <Link to={`/rooms/${room.id}`} className="hover:underline">Quarto {room.number} · {room.typology}</Link>
                      ) : (
                        <span className="text-muted-foreground">Sem quarto atribuído</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <LogIn className="h-3.5 w-3.5" strokeWidth={1.5} /> {fmtDate(s.check_in)}
                      <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                      <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} /> {fmtDate(s.check_out)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{String(s.status).replace("_", " ")}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ContractDetail;
