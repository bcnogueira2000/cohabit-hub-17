import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateContractReservationDocx } from "@/lib/generateContractReservationDocx";

interface Props {
  contractId: string;
  deadline?: string | null;
  feeAmount?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: (doc: { fileName: string; signedUrl: string }) => void;
}

export const ContractReservationDialog = ({
  contractId,
  deadline: initialDeadline,
  feeAmount,
  open,
  onOpenChange,
  onGenerated,
}: Props) => {
  const queryClient = useQueryClient();
  const [deadline, setDeadline] = useState("");
  const [fee, setFee] = useState("200");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeadline(initialDeadline ?? "");
    setFee(String(feeAmount ?? 200));
  }, [open, initialDeadline, feeAmount]);

  const handleGenerate = async () => {
    const feeNumber = Number(fee);
    if (!deadline) {
      toast.error("Indica o prazo limite da reserva.");
      return;
    }
    if (!Number.isFinite(feeNumber) || feeNumber <= 0) {
      toast.error("Indica um valor de taxa de reserva válido.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("contracts" as any)
        .update({ reservation_deadline: deadline, reservation_fee_amount: feeNumber } as any)
        .eq("id", contractId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract", contractId] });

      const doc = await generateContractReservationDocx(contractId);
      onGenerated?.(doc);
      if (doc.signedUrl) window.open(doc.signedUrl, "_blank");
      toast.success("Acordo de reserva gerado");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o acordo de reserva.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Acordo de reserva</DialogTitle>
          <DialogDescription>
            Confirma o prazo limite e a taxa de reserva antes de gerar o documento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo limite da reserva</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Taxa de reserva (€)</label>
            <Input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" strokeWidth={1.5} /> : <FileText className="h-4 w-4 mr-1.5" strokeWidth={1.5} />}
            {busy ? "A gerar…" : "Gerar acordo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
