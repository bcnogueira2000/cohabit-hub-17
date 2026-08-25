import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  useEndTransitionalRentBulk,
  type BulkEndTransitionResultItem,
  type Contract,
} from "@/hooks/useContracts";

const eur = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contracts: Contract[];
  roomLabel: (contractId: string) => string;
}

export const EndTransitionalRentDialog = ({ open, onOpenChange, contracts, roomLabel }: Props) => {
  const [date, setDate] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [results, setResults] = useState<BulkEndTransitionResultItem[]>([]);
  const bulk = useEndTransitionalRentBulk();

  const rows = useMemo(
    () => contracts.filter((c) => c.regularRentAmount != null),
    [contracts]
  );

  // A renda regular só se aplica a meses completos: dia 1 do mês seguinte ao fim das obras.
  const effectiveFrom = useMemo(() => {
    if (!date) return "";
    const [y, m] = date.split("-").map(Number);
    if (!y || !m) return "";
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return `${ny}-${String(nm).padStart(2, "0")}-01`;
  }, [date]);

  const monthLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", opts) : "";

  const reset = () => {
    setDate("");
    setStep("form");
    setResults([]);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const apply = async () => {
    const res = await bulk.mutateAsync({
      validFrom: date,
      contracts: rows.map((c) => ({
        id: c.id,
        residentName: c.residentName,
        regularRentAmount: c.regularRentAmount as number,
      })),
    });
    setResults(res);
    setStep("done");
    const ok = res.filter((r) => r.ok).length;
    toast({
      title: `${ok} contrato${ok === 1 ? "" : "s"} atualizado${ok === 1 ? "" : "s"}`,
      description:
        res.length - ok > 0 ? `${res.length - ok} com erro — ver detalhe.` : "Renda regular aplicada.",
    });
  };

  const okItems = results.filter((r) => r.ok);
  const failItems = results.filter((r) => !r.ok);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Terminar período transitório</DialogTitle>
          <DialogDescription>
            {step === "done"
              ? "Resultado da operação."
              : "Aplica a renda regular a todos os contratos com renda transitória, a partir da data de fim das obras."}
          </DialogDescription>
        </DialogHeader>

        {step !== "done" && (
          <div className="space-y-4">
            <Card className="border-border/60 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Residente</th>
                    <th className="px-3 py-2 font-medium">Quarto</th>
                    <th className="px-3 py-2 font-medium text-right">Transitória</th>
                    <th className="px-3 py-2 font-medium text-right">Regular</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-medium">{c.residentName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{roomLabel(c.id)}</td>
                      <td className="px-3 py-2 text-right">{eur(c.currentRent)}</td>
                      <td className="px-3 py-2 text-right font-medium">{eur(c.regularRentAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div>
              <Label className="text-xs text-muted-foreground">Data real de fim das obras</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStep("form");
                }}
                className="mt-1 w-[200px] rounded-full"
              />
            </div>

            {step === "confirm" && (
              <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" strokeWidth={1.5} />
                <p>
                  Isto vai atualizar <strong>{rows.length}</strong> contrato
                  {rows.length === 1 ? "" : "s"} para a renda regular a partir de{" "}
                  <strong>{new Date(date).toLocaleDateString("pt-PT")}</strong>. Confirmas?
                </p>
              </div>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
              <span>
                {okItems.length} contrato{okItems.length === 1 ? "" : "s"} atualizado
                {okItems.length === 1 ? "" : "s"} com sucesso
              </span>
            </div>
            {okItems.some((r) => (r.locked ?? 0) > 0) && (
              <p className="text-xs text-muted-foreground">
                Algumas rendas já pagas foram preservadas e não foram alteradas.
              </p>
            )}
            {failItems.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="font-medium text-destructive mb-1">
                  {failItems.length} com erro
                </p>
                <ul className="space-y-1 text-xs">
                  {failItems.map((r) => (
                    <li key={r.contractId}>
                      <strong>{r.residentName}</strong>: {r.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "done" ? (
            <Button className="rounded-full" onClick={() => close(false)}>
              Fechar
            </Button>
          ) : (
            <>
              <Button variant="outline" className="rounded-full" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button
                className="rounded-full"
                disabled={!date || rows.length === 0 || bulk.isPending}
                onClick={() => (step === "form" ? setStep("confirm") : apply())}
              >
                <CalendarClock className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                {bulk.isPending
                  ? "A aplicar…"
                  : step === "form"
                  ? "Continuar"
                  : "Confirmar e aplicar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
