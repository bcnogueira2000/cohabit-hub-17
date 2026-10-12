import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { isDepositPaid } from "@/lib/leadContractRules";
import { paymentKindLabel } from "@/hooks/usePayments";

const eur = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

/** Alerta (sem downgrade) se a lead está 'won' mas a caução ou a 1.ª renda deixou de estar paga. */
export const ContractWonAlert = ({ contractId }: { contractId: string }) => {
  const { data } = useQuery({
    queryKey: ["contract", contractId, "won-check"],
    queryFn: async () => {
      const { data: lead } = await supabase
        .from("leads" as any)
        .select("id, status, contract_signed_at")
        .eq("contract_id", contractId)
        .maybeSingle();
      if (!lead || (lead as any).status !== "won" || !(lead as any).contract_signed_at) return null;
      const [{ data: c }, { data: deps }, { data: rc }] = await Promise.all([
        supabase.from("contracts" as any).select("deposit_due").eq("id", contractId).maybeSingle(),
        supabase.from("payments" as any).select("amount").eq("contract_id", contractId).eq("kind", "deposit").eq("status", "active"),
        supabase.from("rent_charge_balance" as any).select("outstanding").eq("contract_id", contractId).order("year").order("month").limit(1).maybeSingle(),
      ]);
      const paid = ((deps ?? []) as any[]).reduce((a, r) => a + Number(r.amount ?? 0), 0);
      const depositPaid = isDepositPaid(Number((c as any)?.deposit_due ?? 0), paid);
      const firstRentPaid = rc != null && Number((rc as any).outstanding ?? 1) <= 0.005;
      return { depositPaid, firstRentPaid };
    },
  });
  if (!data || (data.depositPaid && data.firstRentPaid)) return null;
  const what = [!data.depositPaid && "a caução", !data.firstRentPaid && "a 1.ª renda"].filter(Boolean).join(" e ");
  return (
    <div className="mb-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
      <span>
        A lead deste contrato está "Contratado", mas {what} deixou de estar paga (pagamento anulado). O estado não muda
        automaticamente — confirma os pagamentos.
      </span>
    </div>
  );
};

/** Histórico do contrato (ex.: pagamentos anulados). */
export const ContractActivity = ({ contractId }: { contractId: string }) => {
  const { data: items = [] } = useQuery({
    queryKey: ["contract-activity", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_activity" as any)
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  if (items.length === 0) return null;
  return (
    <Card className="p-5 border-border/60 shadow-card mt-3">
      <h2 className="font-display text-lg font-semibold mb-3">Histórico</h2>
      <ul className="space-y-2 text-sm">
        {items.map((a) => (
          <li key={a.id} className="border-l-2 border-border pl-3">
            <div className="text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleString("pt-PT")} · {a.actor_name || "Sistema"}
            </div>
            {a.kind === "payment_voided" ? (
              <div>
                Pagamento anulado — {paymentKindLabel(a.payload?.kind)} de {eur(Number(a.payload?.amount ?? 0))}
                {a.payload?.reason && <span className="text-muted-foreground"> — motivo: {a.payload.reason}</span>}
              </div>
            ) : (
              <div>{a.kind}</div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
};
