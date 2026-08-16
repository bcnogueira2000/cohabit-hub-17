import { useState } from "react";
import { AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAddRentPeriod, type RecalculationResult, type RentPeriod } from "@/hooks/useContracts";

const eur = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

type Props = {
  contractId: string;
  startDate: string;
  periods: RentPeriod[];
};

export const RentPeriodsSection = ({ contractId, startDate, periods }: Props) => {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState<RecalculationResult["locked"]>([]);
  const addPeriod = useAddRentPeriod();

  const ordered = [...periods].sort((a, b) => (a.validFrom < b.validFrom ? -1 : 1));
  const today = new Date().toISOString().slice(0, 10);
  const activeId = [...ordered].reverse().find((p) => p.validFrom <= today)?.id;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const validFrom = String(fd.get("validFrom"));
    const monthlyAmount = Number(fd.get("monthlyAmount"));
    if (!validFrom || !monthlyAmount || monthlyAmount <= 0) {
      toast.error("Indica a data de início e o novo valor");
      return;
    }
    try {
      const result = await addPeriod.mutateAsync({
        contractId,
        validFrom,
        monthlyAmount,
        reason: String(fd.get("reason") || ""),
      });
      setLocked(result?.locked ?? []);
      const lockedCount = result?.locked_count ?? 0;
      if (lockedCount > 0) {
        toast.warning(
          `${lockedCount} ${lockedCount === 1 ? "renda já paga não foi atualizada" : "rendas já pagas não foram atualizadas"} porque já têm pagamentos registados`
        );
      } else {
        toast.success("Adenda registada e rendas recalculadas");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao registar a adenda");
    }
  };

  return (
    <Card className="p-5 border-border/60 shadow-card mb-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-lg font-semibold">Valores acordados ({ordered.length})</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Nova adenda
        </Button>
      </div>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem valores acordados registados.</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3"
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Desde {fmtDate(p.validFrom)}</div>
                {p.reason && <p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p>}
              </div>
              {p.id === activeId && (
                <span className="text-xs rounded-full bg-success/10 text-success px-2 py-0.5">
                  Em vigor
                </span>
              )}
              <span className="font-display font-semibold">{eur(p.monthlyAmount)}</span>
            </div>
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            {locked.length} {locked.length === 1 ? "renda já paga não foi atualizada" : "rendas já pagas não foram atualizadas"} porque já têm pagamentos registados
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {locked.map((l) => (
              <li key={l.id}>
                {String(l.month).padStart(2, "0")}/{l.year}: atual {eur(Number(l.current_amount))}
                {l.expected_amount != null && <> · calculado {eur(Number(l.expected_amount))}</>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Requer decisão manual.</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Nova adenda</DialogTitle>
            <p className="text-sm text-muted-foreground">
              O novo valor entra em vigor na data indicada. As rendas são recalculadas com pró-rata
              por dias; rendas com pagamentos registados ficam intocadas.
            </p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Em vigor desde</Label>
                <Input name="validFrom" type="date" min={startDate} required className="mt-1.5" />
              </div>
              <div>
                <Label>Novo valor (€)</Label>
                <Input
                  name="monthlyAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input name="reason" placeholder="Ex.: atualização anual" className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addPeriod.isPending}>
                {addPeriod.isPending ? "A gravar…" : "Gravar adenda"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
