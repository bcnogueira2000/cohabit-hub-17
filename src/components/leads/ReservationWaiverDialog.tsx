import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateLead, useReserveRoomWithoutFee, type Lead } from "@/hooks/useLeads";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";
import { useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/hooks/useAppSettings";
import { monthsBetween } from "@/components/leads/ReservationAgreementDialog";

interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmt = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

export const ReservationWaiverDialog = ({ lead, open, onOpenChange }: Props) => {
  const updateLead = useUpdateLead();
  const reserve = useReserveRoomWithoutFee();
  const { data: rooms = [] } = useRooms();
  const { settings } = useAppSettings();
  const minMonths = Math.max(0, Number(settings.reservation_min_months ?? 3) || 3);
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRoomId(lead.roomId ?? "");
    setCheckIn(lead.plannedCheckIn ?? "");
    setCheckOut(lead.plannedCheckOut ?? "");
    setReason("");
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

  const handleContinue = () => {
    if (!validPeriod) return toast.error("Indica datas de entrada e saída válidas.");
    if (tooShort)
      return toast.error(`A estadia tem de durar pelo menos ${minMonths} ${minMonths === 1 ? "mês" : "meses"}.`);
    if (!roomId) return toast.error("Escolhe o quarto a reservar.");
    if (!reason.trim()) return toast.error("Indica o motivo.");
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        patch: { roomId, plannedCheckIn: checkIn, plannedCheckOut: checkOut },
      });
      await reserve.mutateAsync({ leadId: lead.id, reason: reason.trim() });
      toast.success(`Quarto ${roomNumber} reservado sem taxa.`);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reservar o quarto.");
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Acordo de reserva não aplicável</DialogTitle>
            <DialogDescription>
              Reserva o quarto para este candidato sem acordo nem taxa de reserva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Entrada</label>
                <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Saída</label>
                <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
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
                <p className="text-[11px] text-muted-foreground">
                  {availableRooms.length} quarto(s) livre(s) neste período.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Motivo (obrigatório)</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={handleContinue} disabled={busy} className="rounded-full">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar reserva sem taxa</AlertDialogTitle>
            <AlertDialogDescription>
              Isto bloqueia o quarto {roomNumber} de {fmt(checkIn)} a {fmt(checkOut)} para este candidato sem
              pagamento de taxa. Confirmas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
            >
              {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.5} />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
