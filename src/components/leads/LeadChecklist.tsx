import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/hooks/useLeads";
import { isCheckInSoonNotWon, isDepositPaid, meetsWonCondition } from "@/lib/leadContractRules";

type Progress = {
  feeDue: number;
  feePaid: number;
  depositPaid: boolean;
  firstRentPaid: boolean;
  hasContract: boolean;
};

/** Checklist do percurso da lead, calculada a partir dos dados (não editável). */
export const LeadChecklist = ({ lead }: { lead: Lead }) => {
  // queryKey começa por "leads" para refrescar sempre que a lista de leads é invalidada
  const { data: p } = useQuery({
    queryKey: ["leads", "progress", lead.id, lead.contractId],
    queryFn: async (): Promise<Progress> => {
      const { data: fees } = await supabase
        .from("payments" as any)
        .select("amount")
        .eq("lead_id", lead.id)
        .eq("kind", "booking_fee");
      const feePaid = ((fees ?? []) as any[]).reduce((a, r) => a + Number(r.amount ?? 0), 0);
      let depositPaid = false;
      let firstRentPaid = false;
      if (lead.contractId) {
        const [{ data: c }, { data: deps }, { data: rc }] = await Promise.all([
          supabase.from("contracts" as any).select("deposit_due").eq("id", lead.contractId).maybeSingle(),
          supabase.from("payments" as any).select("amount").eq("contract_id", lead.contractId).eq("kind", "deposit"),
          supabase
            .from("rent_charge_balance" as any)
            .select("outstanding")
            .eq("contract_id", lead.contractId)
            .order("year")
            .order("month")
            .limit(1)
            .maybeSingle(),
        ]);
        const paid = ((deps ?? []) as any[]).reduce((a, r) => a + Number(r.amount ?? 0), 0);
        depositPaid = isDepositPaid(Number((c as any)?.deposit_due ?? 0), paid);
        firstRentPaid = rc != null && Number((rc as any).outstanding ?? 1) <= 0.005;
      }
      return {
        feeDue: Number(lead.reservationFeeAmount ?? 0),
        feePaid,
        depositPaid,
        firstRentPaid,
        hasContract: !!lead.contractId,
      };
    },
  });

  if (lead.status === "lost" || !p) return null;

  const feeOk = lead.reservationNotApplicable || (p.feeDue > 0.005 && p.feePaid + 0.005 >= p.feeDue);
  const items: { label: string; done: boolean }[] = [
    { label: "Formulário preenchido", done: !!lead.formSubmittedAt },
    {
      label: lead.reservationNotApplicable ? "Reserva sem taxa" : "Acordo de reserva gerado",
      done: !!lead.reservationAgreementGeneratedAt || lead.reservationNotApplicable,
    },
    { label: "Taxa de reserva paga", done: feeOk },
    { label: "Contrato gerado", done: !!lead.contractGeneratedAt },
    { label: "Assinado", done: !!lead.contractSignedAt },
    { label: "Caução paga", done: p.hasContract && p.depositPaid },
    { label: "1.ª renda paga", done: p.hasContract && p.firstRentPaid },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const alerts: string[] = [];
  const agreementStarted = !!lead.reservationAgreementGeneratedAt || lead.status === "reserved" || lead.status === "won";
  if (agreementStarted && !feeOk) alerts.push("Taxa de reserva por pagar (não bloqueia).");
  if (isCheckInSoonNotWon(lead.status, lead.plannedCheckIn, today))
    alerts.push("Entrada a menos de 7 dias e a lead ainda não está contratada.");
  if (
    lead.status === "won" &&
    lead.contractSignedAt &&
    !meetsWonCondition({ signed: true, depositPaid: p.depositPaid, firstRentPaid: p.firstRentPaid })
  )
    alerts.push("Contratada, mas a caução ou a 1.ª renda deixou de estar paga.");

  return (
    <div className="rounded-xl border border-border/60 p-3 mt-3 space-y-2">
      <h3 className="font-display text-sm font-semibold">Percurso</h3>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-xs">
            {i.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            )}
            <span className={i.done ? "" : "text-muted-foreground"}>{i.label}</span>
          </li>
        ))}
      </ul>
      {alerts.map((a) => (
        <p key={a} className="flex gap-1.5 text-[11px] text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> {a}
        </p>
      ))}
    </div>
  );
};
