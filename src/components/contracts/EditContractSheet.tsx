import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useUpdateContract, useContractStays, type Contract, type RecalculationResult } from "@/hooks/useContracts";
import { useRooms } from "@/hooks/useData";

const eur = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

type Props = {
  contract: Contract;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export const EditContractSheet = ({ contract, open, onOpenChange }: Props) => {
  const update = useUpdateContract();
  const { data: stays = [] } = useContractStays(contract.id);
  const { data: rooms = [] } = useRooms();
  const [endDate, setEndDate] = useState(contract.endDate);
  const [paymentDay, setPaymentDay] = useState(String(contract.paymentDay));
  const [depositDue, setDepositDue] = useState(String(contract.depositDue));
  const [autoRenew, setAutoRenew] = useState(contract.autoRenew);
  const [notes, setNotes] = useState(contract.notes ?? "");
  const [locked, setLocked] = useState<RecalculationResult["locked"]>([]);

  /** Estadia ligada, editável apenas antes do check-in */
  const editableStay = useMemo(
    () => (stays as any[]).find((s) => s.status === "confirmed") ?? null,
    [stays]
  );
  const [roomId, setRoomId] = useState<string>("");
  const currentRoomId = editableStay?.room_id ?? null;
  const selectedRoomId = roomId || currentRoomId || "";
  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.number.localeCompare(b.number, "pt", { numeric: true })),
    [rooms]
  );


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const day = Number(paymentDay);
    const deposit = Number(depositDue);
    if (!endDate) return toast.error("Indica a data de fim");
    if (endDate <= contract.startDate) return toast.error("A data de fim tem de ser depois do início");
    if (!Number.isInteger(day) || day < 1 || day > 28)
      return toast.error("O dia de vencimento tem de estar entre 1 e 28");
    if (Number.isNaN(deposit) || deposit < 0) return toast.error("Caução inválida");

    const endDateChanged = endDate !== contract.endDate;
    const paymentDayChanged = day !== contract.paymentDay;
    try {
      const result = await update.mutateAsync({
        id: contract.id,
        endDate,
        paymentDay: day,
        depositDue: deposit,
        autoRenew,
        notes,
        endDateChanged,
        paymentDayChanged,
      });
      setLocked(result?.locked ?? []);
      const lockedCount = result?.locked_count ?? 0;
      if (lockedCount > 0) {
        toast.warning(
          `${lockedCount} ${lockedCount === 1 ? "renda não foi removida porque já tem pagamentos registados" : "rendas não foram removidas porque já têm pagamentos registados"}`
        );
      } else if (endDateChanged || paymentDayChanged) {
        toast.success("Contrato atualizado e rendas recalculadas");
        onOpenChange(false);
      } else {
        toast.success("Contrato atualizado");
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao gravar o contrato");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Editar contrato</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            Alterar a data de fim recalcula as rendas: meses que deixam de existir são removidos,
            exceto se já tiverem pagamentos registados.
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <Label>Data de fim</Label>
            <Input
              type="date"
              value={endDate}
              min={contract.startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia de vencimento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Caução devida (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositDue}
                onChange={(e) => setDepositDue(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <Label className="cursor-pointer">Renovação automática</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Renova o contrato no fim do prazo.
              </p>
            </div>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1.5"
            />
          </div>

          {locked.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                {locked.length}{" "}
                {locked.length === 1
                  ? "renda não foi removida porque já tem pagamentos registados"
                  : "rendas não foram removidas porque já têm pagamentos registados"}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {locked.map((l) => (
                  <li key={l.id}>
                    {String(l.month).padStart(2, "0")}/{l.year}: {eur(Number(l.current_amount))}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Requer decisão manual.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "A gravar…" : "Gravar alterações"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
