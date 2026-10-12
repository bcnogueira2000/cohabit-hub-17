import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useMyRoles } from "@/hooks/useProfile";
import {
  isFromMoloni,
  isVoided,
  paymentKindLabel,
  paymentMethodLabels,
  useVoidPayment,
  type PaymentMethod,
} from "@/hooks/usePayments";

const eur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-PT") : "—");

/** Linha de um pagamento registado, com "Anular" (admin/gestor) e o estado anulado. */
export const PaymentEntry = ({ payment: p, sign, tag }: { payment: any; sign?: "+" | "−"; tag?: string }) => {
  const { data: roles = [] } = useMyRoles();
  const canVoid = roles.includes("admin" as any) || roles.includes("manager" as any);
  const voidMut = useVoidPayment();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const voided = isVoided(p);
  const moloni = isFromMoloni(p);

  const confirm = async () => {
    try {
      await voidMut.mutateAsync({ paymentId: p.id, reason: reason.trim() });
      toast({ title: "Pagamento anulado", description: "Fica no histórico e deixa de contar nos totais." });
      setOpen(false);
      setReason("");
    } catch (e: any) {
      toast({ title: "Não foi possível anular", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className={`rounded-lg border border-border/60 px-3 py-2 text-sm ${voided ? "bg-muted/40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={voided ? "text-muted-foreground" : ""}>
          <div className={`font-medium ${voided ? "line-through" : ""}`}>
            {sign ? `${sign} ` : ""}
            {eur(Number(p.amount))}
          </div>
          <div className="text-xs text-muted-foreground">
            {fmt(p.paid_at)}
            {p.method ? ` · ${paymentMethodLabels[p.method as PaymentMethod]}` : ""}
            {p.reference ? ` · ${p.reference}` : ""}
            {moloni ? " · Moloni" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tag && <span className="text-xs text-muted-foreground">{tag}</span>}
          {voided ? (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Anulado</Badge>
          ) : canVoid && !moloni ? (
            <Button size="sm" variant="ghost" className="h-7 rounded-full text-destructive" onClick={() => setOpen(true)}>
              <Ban className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} /> Anular
            </Button>
          ) : null}
        </div>
      </div>
      {voided && (
        <p className="text-xs text-muted-foreground mt-1">
          Anulado {p.voided_at ? `a ${fmt(p.voided_at)}` : ""}
          {p.voided_by_name ? ` por ${p.voided_by_name}` : ""} — {p.void_reason}
        </p>
      )}
      {!voided && moloni && canVoid && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Importado do Moloni: não se anula na app. Corrige-o no Moloni.
        </p>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentKindLabel(p.kind)} de {eur(Number(p.amount))} ({fmt(p.paid_at)}). O registo fica no histórico
              marcado como anulado e deixa de contar em todos os totais. Não é possível desfazer.
              {p.kind === "booking_fee" && " A reserva do quarto mantém-se."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Motivo (obrigatório)</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Ex: registado no contrato errado" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={!reason.trim() || voidMut.isPending} onClick={confirm}>
              Anular pagamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
