import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { findPendingAgreements } from "@/lib/leadContractRules";

const fmt = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Aviso (não bloqueia) quando outra lead tem acordo pendente para o mesmo quarto e período. */
export const PendingAgreementWarning = ({
  leadId,
  roomId,
  roomNumber,
  checkIn,
  checkOut,
}: {
  leadId: string;
  roomId: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
}) => {
  const { data: leads = [] } = useLeads();
  const conflicts = useMemo(() => {
    if (!roomId || !checkIn || !checkOut || checkIn >= checkOut) return [];
    const today = new Date().toISOString().slice(0, 10);
    return findPendingAgreements(leads as any, { leadId, roomId, checkIn, checkOut, today });
  }, [leads, leadId, roomId, checkIn, checkOut]);

  if (conflicts.length === 0) return null;
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-2 space-y-1">
      {conflicts.map((c) => (
        <p key={c.id} className="text-[11px] text-foreground flex gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.5} />
          O quarto {roomNumber || ""} tem um acordo pendente para {c.fullName} de {fmt(c.plannedCheckIn)} a{" "}
          {fmt(c.plannedCheckOut)}.
        </p>
      ))}
    </div>
  );
};
