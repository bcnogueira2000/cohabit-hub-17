import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateLead, useReserveRoomForLead, type Lead } from "@/hooks/useLeads";
import { generateReservationDocx } from "@/lib/generateReservationDocx";
import { RoomCombobox } from "@/components/rooms/RoomCombobox";
import { useRooms } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";


interface Props {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Field = ({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-1">
    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <Input {...props} />
  </div>
);

export const ReservationAgreementDialog = ({ lead, open, onOpenChange }: Props) => {
  const updateLead = useUpdateLead();
  const [deadline, setDeadline] = useState("");
  const [fee, setFee] = useState("200");
  const [address, setAddress] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentValidity, setDocumentValidity] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDeadline(lead.reservationDeadline ?? "");
    setFee(String(lead.reservationFeeAmount ?? 200));
    setAddress(lead.address ?? "");
    setDocumentNumber(lead.documentNumber ?? "");
    setDocumentValidity(lead.documentValidity ?? "");
    setTaxNumber(lead.taxNumber ?? "");
  }, [open, lead]);

  // Só mostramos os campos que ainda faltam na lead
  const needAddress = !lead.address;
  const needDocument = !lead.documentNumber;
  const needValidity = !lead.documentValidity;
  const needTax = !lead.taxNumber;
  const needDeadline = !lead.reservationDeadline;
  const needFee = lead.reservationFeeAmount == null;

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
    if (!address.trim() || !documentNumber.trim() || !documentValidity || !taxNumber.trim()) {
      toast.error("Preenche morada, documento de identificação, validade e NIF.");
      return;
    }
    setBusy(true);
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        patch: {
          reservationDeadline: deadline,
          reservationFeeAmount: feeNumber,
          address: address.trim(),
          documentNumber: documentNumber.trim(),
          documentValidity,
          taxNumber: taxNumber.trim(),
        },
      });
      const doc = await generateReservationDocx(lead.id);
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
            Confirma os dados em falta antes de gerar o documento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {needAddress && (
            <Field label="Morada de residência" value={address} onChange={(e) => setAddress(e.target.value)} />
          )}
          {needDocument && (
            <Field
              label="Nº do documento de identificação"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
          )}
          {needValidity && (
            <Field
              label="Validade do documento"
              type="date"
              value={documentValidity}
              onChange={(e) => setDocumentValidity(e.target.value)}
            />
          )}
          {needTax && <Field label="NIF" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />}
          {needDeadline && (
            <Field
              label="Prazo limite da reserva"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          )}
          {needFee && (
            <Field
              label="Taxa de reserva (€)"
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          )}
          {!needAddress && !needDocument && !needValidity && !needTax && !needDeadline && !needFee && (
            <p className="text-sm text-muted-foreground">
              Todos os dados necessários estão preenchidos. Podes gerar o documento.
            </p>
          )}
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
            Gerar documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
