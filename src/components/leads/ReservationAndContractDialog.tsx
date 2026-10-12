import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lead } from "@/hooks/useLeads";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";
import { useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { monthsBetween } from "@/components/leads/ReservationAgreementDialog";
import { PendingAgreementWarning } from "@/components/leads/PendingAgreementWarning";
import { generateReservationDocx } from "@/lib/generateReservationDocx";
import { generateContractDocxFromLead } from "@/lib/generateContractDocxFromLead";
import { missingPersonalFields } from "@/lib/leadContractRules";
import {
  CandidateDataSection,
  candidateDataFromLead,
  candidateDataPatch,
  type CandidateData,
} from "@/components/leads/CandidateDataSection";

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Doc = { fileName: string; signedUrl: string };

const Field = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-1">
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <Input {...props} />
  </div>
);

/** Gera o acordo de reserva e o contrato de uma só vez, recolhendo os dados uma única vez. */
export const ReservationAndContractDialog = ({ lead, open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const { data: rooms = [] } = useRooms();
  const { settings } = useAppSettings();
  const minMonths = Math.max(0, Number(settings.reservation_min_months ?? 3) || 3);

  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fee, setFee] = useState("200");
  const [rent, setRent] = useState("");
  const [paymentDay, setPaymentDay] = useState("5");
  const [deposit, setDeposit] = useState("");
  const [p, setP] = useState<CandidateData>(candidateDataFromLead(lead));
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<{ agreement?: Doc; contract?: Doc }>({});

  useEffect(() => {
    if (!open) return;
    setDocs({});
    setRoomId(lead.roomId ?? "");
    setCheckIn(lead.plannedCheckIn ?? "");
    setCheckOut(lead.plannedCheckOut ?? "");
    setDeadline(lead.reservationDeadline ?? "");
    setFee(String(lead.reservationFeeAmount ?? 200));
    setP(candidateDataFromLead(lead));
    (async () => {
      const { data } = await supabase
        .from("leads" as any)
        .select("draft_rent_amount, draft_deposit_due, draft_payment_day")
        .eq("id", lead.id)
        .maybeSingle();
      const d: any = data ?? {};
      setRent(d.draft_rent_amount != null ? String(d.draft_rent_amount) : "");
      setDeposit(d.draft_deposit_due != null ? String(d.draft_deposit_due) : "");
      setPaymentDay(d.draft_payment_day != null ? String(d.draft_payment_day) : "5");
    })();
  }, [open, lead.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validPeriod = !!checkIn && !!checkOut && checkIn < checkOut;

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
      return ((data ?? []) as any[]).filter((s) => s.room_id && s.lead_id !== lead.id).map((s) => s.room_id);
    },
  });

  const availableRooms = useMemo(() => {
    const b = new Set(busyRoomIds);
    return rooms.filter((r) => !b.has(r.id) && r.status !== "out_of_service" && r.status !== "maintenance");
  }, [rooms, busyRoomIds]);

  const roomNumber = rooms.find((r) => r.id === roomId)?.number ?? "";
  const tooShort = validPeriod && monthsBetween(checkIn, checkOut) < minMonths;

  const handleGenerate = async () => {
    const feeNumber = Number(fee);
    const rentNumber = Number(rent);
    if (!validPeriod) return toast.error("Indica datas de entrada e saída válidas.");
    if (tooShort)
      return toast.error(`A estadia tem de durar pelo menos ${minMonths} ${minMonths === 1 ? "mês" : "meses"}.`);
    if (!roomId) return toast.error("Escolhe o quarto a reservar.");
    if (!deadline) return toast.error("Indica o prazo limite da reserva.");
    if (!Number.isFinite(feeNumber) || feeNumber <= 0) return toast.error("Indica um valor de taxa de reserva válido.");
    if (!rentNumber || rentNumber <= 0) return toast.error("Indica a renda mensal.");
    const missing = missingPersonalFields({ fullName: lead.fullName, email: lead.email, ...p });
    if (missing.length) return toast.error(`Faltam dados pessoais: ${missing.join(", ")}.`);

    setBusy(true);
    const result: { agreement?: Doc; contract?: Doc } = {};
    try {
      const { error: upErr } = await supabase
        .from("leads" as any)
        .update({
          room_id: roomId,
          planned_check_in: checkIn,
          planned_check_out: checkOut,
          reservation_deadline: deadline,
          reservation_fee_amount: feeNumber,
          draft_rent_amount: rentNumber,
          draft_deposit_due: Number(deposit || 0),
          draft_payment_day: Number(paymentDay || 5),
          ...candidateDataPatch(p),
        } as any)
        .eq("id", lead.id);
      if (upErr) throw new Error(`Não foi possível gravar os dados: ${upErr.message}`);

      try {
        const a = await generateReservationDocx(lead.id);
        result.agreement = { fileName: a.fileName, signedUrl: a.signedUrl };
      } catch (e) {
        throw new Error(`Falhou a geração do acordo de reserva: ${e instanceof Error ? e.message : e}`);
      }

      try {
        const c = await generateContractDocxFromLead(lead.id, {
          monthlyAmount: rentNumber,
          paymentDay: Number(paymentDay || 5),
          depositDue: Number(deposit || 0),
          startDate: checkIn,
          endDate: checkOut,
          roomNumber,
        });
        const { error: genErr } = await supabase
          .from("leads" as any)
          .update({ contract_generated_at: new Date().toISOString() } as any)
          .eq("id", lead.id);
        if (genErr) throw genErr;
        result.contract = { fileName: c.fileName, signedUrl: c.signedUrl };
      } catch (e) {
        throw new Error(
          `O acordo de reserva foi gerado, mas falhou a geração do contrato: ${e instanceof Error ? e.message : e}`
        );
      }
      toast.success("Acordo de reserva e contrato gerados. O quarto só fica reservado com o pagamento da taxa ou ao assinar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar os documentos.");
    } finally {
      setDocs(result);
      qc.invalidateQueries({ queryKey: ["leads"] });
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Gerar acordo + contrato</DialogTitle>
          <DialogDescription>
            Recolhe os dados uma vez e gera os dois documentos. O quarto só fica reservado com o pagamento da taxa ou
            ao marcar "Assinou".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo limite da reserva" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            <Field label="Taxa de reserva (€)" type="number" min="0.01" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            A taxa de reserva é a fundo perdido: não é abatida à caução nem à renda.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Renda mensal (€)" type="number" min="0" step="0.01" value={rent} onChange={(e) => setRent(e.target.value)} />
            <Field label="Dia de vencimento" type="number" min="1" max="28" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} />
            <Field label="Caução (€)" type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
          <CandidateDataSection value={p} onChange={setP} />
          {(docs.agreement || docs.contract) && (
            <div className="space-y-2">
              {docs.agreement && (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <a href={docs.agreement.signedUrl} download={docs.agreement.fileName}>
                    <Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> {docs.agreement.fileName}
                  </a>
                </Button>
              )}
              {docs.contract && (
                <Button asChild variant="outline" className="w-full rounded-full">
                  <a href={docs.contract.signedUrl} download={docs.contract.fileName}>
                    <Download className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> {docs.contract.fileName}
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Fechar
          </Button>
          <Button onClick={handleGenerate} disabled={busy} className="rounded-full">
            {busy ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
            )}
            {docs.contract ? "Gerar novamente" : "Gerar os dois"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
