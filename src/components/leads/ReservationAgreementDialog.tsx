import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReserveRoomWithoutFee, type Lead } from "@/hooks/useLeads";
import { generateReservationDocx } from "@/lib/generateReservationDocx";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";
import { useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { PendingAgreementWarning } from "@/components/leads/PendingAgreementWarning";
import { useUnvalidatedDocsGuard } from "@/components/leads/UnvalidatedDocsGuard";
import {
  CandidateDataSection,
  candidateDataFromLead,
  candidateDataPatch,
  type CandidateData,
} from "@/components/leads/CandidateDataSection";

/** Meses completos entre duas datas ISO (yyyy-mm-dd). */
export const monthsBetween = (from: string, to: string) => {
  const a = new Date(from);
  const b = new Date(to);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
};

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Field = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-1">
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <Input {...props} />
  </div>
);

const fmt = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

export const ReservationAgreementDialog = ({ lead, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const reserveWithoutFee = useReserveRoomWithoutFee();
  const { data: rooms = [] } = useRooms();
  const { settings } = useAppSettings();
  const minMonths = Math.max(0, Number(settings.reservation_min_months ?? 3) || 3);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fee, setFee] = useState("200");
  const [candidate, setCandidate] = useState<CandidateData>(candidateDataFromLead(lead));
  const [noFee, setNoFee] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const docsGuard = useUnvalidatedDocsGuard(lead, open, "reservation");

  useEffect(() => {
    if (!open) return;
    setDeadline(lead.reservationDeadline ?? "");
    setFee(String(lead.reservationFeeAmount ?? 200));
    setCandidate(candidateDataFromLead(lead));
    setRoomId(lead.roomId ?? "");
    setCheckIn(lead.plannedCheckIn ?? "");
    setCheckOut(lead.plannedCheckOut ?? "");
    setNoFee(false);
    setReason("");
  }, [open, lead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validPeriod = !!checkIn && !!checkOut && checkIn < checkOut;

  // Estadias que ocupam quartos no período escolhido (confirmadas ou em curso)
  const { data: busyRoomIds = [] } = useQuery({
    queryKey: ["room-availability", checkIn, checkOut],
    enabled: open && validPeriod,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("stays")
        .select("room_id, lead_id")
        .in("status", ["confirmed", "checked_in"])
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);
      if (error) throw error;
      return ((data ?? []) as any[]).filter((s) => s.room_id && s.lead_id !== lead.id).map((s) => s.room_id as string);
    },
  });

  const availableRooms = useMemo(() => {
    const b = new Set(busyRoomIds);
    return rooms.filter((r) => !b.has(r.id) && r.status !== "out_of_service" && r.status !== "maintenance");
  }, [rooms, busyRoomIds]);

  // Taxa editável, exceto quando já existe pagamento registado
  const { data: feePaid = false } = useQuery({
    queryKey: ["booking-fee-payments", null, lead.id, "exists"],
    enabled: open,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("payments" as any)
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .eq("kind", "booking_fee")
        .eq("status", "active");
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  const roomNumber = rooms.find((r) => r.id === roomId)?.number ?? "";
  const tooShort = validPeriod && monthsBetween(checkIn, checkOut) < minMonths;
  const feeIsZero = !noFee && fee.trim() !== "" && Number(fee) === 0;

  const validateCommon = () => {
    if (!validPeriod) {
      toast.error("Indica datas de entrada e saída válidas.");
      return false;
    }
    if (tooShort) {
      toast.error(`A estadia tem de durar pelo menos ${minMonths} ${minMonths === 1 ? "mês" : "meses"} entre a entrada e a saída.`);
      return false;
    }
    if (!roomId) {
      toast.error("Escolhe o quarto a reservar.");
      return false;
    }
    return true;
  };

  const saveLead = async (extra: Record<string, unknown>) => {
    const { error } = await supabase
      .from("leads" as any)
      .update({
        room_id: roomId,
        planned_check_in: checkIn,
        planned_check_out: checkOut,
        ...candidateDataPatch(candidate),
        ...extra,
      } as any)
      .eq("id", lead.id);
    if (error) throw error;
  };

  const handleGenerate = async () => {
    if (!validateCommon()) return;
    if (noFee) {
      if (!reason.trim()) return toast.error("Indica o motivo para não cobrar taxa.");
      setConfirmOpen(true);
      return;
    }
    const feeNumber = Number(fee);
    if (!deadline) return toast.error("Indica o prazo limite da reserva.");
    if (!Number.isFinite(feeNumber) || feeNumber <= 0)
      return toast.error("Indica um valor de taxa de reserva válido (ou marca 'Sem taxa de reserva').");
    if (!candidate.address.trim() || !candidate.documentNumber.trim() || !candidate.documentValidity || !candidate.taxNumber.trim())
      return toast.error("Preenche morada, documento de identificação, validade e NIF.");
    docsGuard.guard(() => doGenerate(feeNumber));
  };

  const doGenerate = async (feeNumber: number) => {
    setBusy(true);
    try {
      await saveLead({
        reservation_deadline: deadline,
        ...(feePaid ? {} : { reservation_fee_amount: feeNumber }),
      });
      const doc = await generateReservationDocx(lead.id);
      qc.invalidateQueries({ queryKey: ["leads"] });
      if (doc.signedUrl) window.open(doc.signedUrl, "_blank");
      toast.success("Acordo gerado. O quarto só fica reservado após o pagamento da taxa.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o acordo de reserva.");
    } finally {
      setBusy(false);
    }
  };

  const handleReserveWithoutFee = async () => {
    setBusy(true);
    try {
      await saveLead({});
      await reserveWithoutFee.mutateAsync({ leadId: lead.id, reason: reason.trim() });
      toast.success(`Quarto ${roomNumber} reservado sem taxa.`);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reservar o quarto.");
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["leads"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Acordo de reserva</DialogTitle>
            <DialogDescription>
              Escolhe o quarto e as datas previstas. O quarto só fica reservado quando a taxa for paga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {docsGuard.warning}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entrada" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              <Field label="Saída" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Quarto a reservar</label>
              <RoomCombobox
                rooms={availableRooms}
                value={roomId}
                onChange={setRoomId}
                placeholder={validPeriod ? "Escolher quarto disponível" : "Escolher quarto"}
              />
              {tooShort && (
                <p className="text-[11px] text-destructive">
                  Duração mínima: {minMonths} {minMonths === 1 ? "mês" : "meses"}.
                </p>
              )}
              {validPeriod && (
                <p className="text-[11px] text-muted-foreground">{availableRooms.length} quarto(s) livre(s) neste período.</p>
              )}
              <PendingAgreementWarning
                leadId={lead.id}
                roomId={roomId}
                roomNumber={roomNumber}
                checkIn={checkIn}
                checkOut={checkOut}
              />
            </div>

            {!feePaid && (
              <label className="flex items-start gap-2 rounded-lg border border-border p-2.5 cursor-pointer">
                <Checkbox checked={noFee} onCheckedChange={(v) => setNoFee(v === true)} className="mt-0.5" />
                <span className="text-sm">
                  Sem taxa de reserva (não gera acordo)
                  <span className="block text-[11px] text-muted-foreground">
                    O quarto fica logo reservado para este candidato, sem pagamento.
                  </span>
                </span>
              </label>
            )}

            {noFee ? (
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Motivo (obrigatório)</label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prazo limite da reserva" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  <Field
                    label={feePaid ? "Taxa (€) — já paga" : "Taxa de reserva (€)"}
                    type="number"
                    min="0"
                    step="0.01"
                    value={fee}
                    readOnly={feePaid}
                    disabled={feePaid}
                    onChange={(e) => setFee(e.target.value)}
                  />
                </div>
                {feeIsZero && (
                  <p className="text-[11px] text-warning">
                    Para não cobrar taxa, marca "Sem taxa de reserva (não gera acordo)".
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  A taxa de reserva é a fundo perdido: não é abatida à caução nem à renda.
                </p>
              </>
            )}

            <CandidateDataSection value={candidate} onChange={setCandidate} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={busy} className="rounded-full">
              {busy ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <FileText className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
              )}
              {noFee ? "Reservar sem taxa" : "Gerar acordo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reserva sem taxa</AlertDialogTitle>
            <AlertDialogDescription>
              Isto bloqueia o quarto {roomNumber} de {fmt(checkIn)} a {fmt(checkOut)} para este candidato sem pagamento
              de taxa. Confirmas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleReserveWithoutFee();
              }}
            >
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.5} />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {docsGuard.dialog}
    </>
  );
};
