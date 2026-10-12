import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "@/hooks/useLeads";
import { isDepositPaid, type PendingExtras } from "@/lib/leadContractRules";

type Ctx = { extrasFor: (lead: Lead) => PendingExtras };
const LeadPendingCtx = createContext<Ctx>({ extrasFor: () => ({}) });

/**
 * Carrega, de uma vez, o necessário para a etiqueta "Pendente":
 * - pagamentos (caução / 1.ª renda) só das leads assinadas, com a mesma conta da checklist;
 * - registos "Já tenho os dados" só de leads em proposta/negociação sem formulário preenchido.
 * queryKey começa por "leads" para refrescar sempre que as leads são invalidadas.
 */
export const LeadPendingProvider = ({ leads, children }: { leads: Lead[]; children: ReactNode }) => {
  const signedContracts = useMemo(
    () =>
      leads
        .filter((l) => l.status !== "lost" && l.contractSignedAt && l.contractId)
        .map((l) => l.contractId as string)
        .sort(),
    [leads]
  );
  const bypassCandidates = useMemo(
    () =>
      leads
        .filter((l) => ["proposal_sent", "negotiating"].includes(l.status) && !l.formSubmittedAt)
        .map((l) => l.id)
        .sort(),
    [leads]
  );

  const { data: pay } = useQuery({
    queryKey: ["leads", "pending-payments", signedContracts],
    enabled: signedContracts.length > 0,
    queryFn: async () => {
      const [{ data: cs }, { data: deps }, { data: rcs }] = await Promise.all([
        supabase.from("contracts" as any).select("id, deposit_due").in("id", signedContracts),
        supabase.from("payments" as any).select("contract_id, amount").in("contract_id", signedContracts).eq("kind", "deposit").eq("status", "active"),
        supabase
          .from("rent_charge_balance" as any)
          .select("contract_id, year, month, outstanding")
          .in("contract_id", signedContracts)
          .order("year")
          .order("month"),
      ]);
      const paid = new Map<string, number>();
      for (const d of (deps ?? []) as any[]) paid.set(d.contract_id, (paid.get(d.contract_id) ?? 0) + Number(d.amount ?? 0));
      const firstRent = new Map<string, boolean>();
      for (const r of (rcs ?? []) as any[])
        if (!firstRent.has(r.contract_id)) firstRent.set(r.contract_id, Number(r.outstanding ?? 1) <= 0.005);
      const out = new Map<string, { depositPaid: boolean; firstRentPaid: boolean }>();
      for (const c of (cs ?? []) as any[])
        out.set(c.id, {
          depositPaid: isDepositPaid(Number(c.deposit_due ?? 0), paid.get(c.id) ?? 0),
          firstRentPaid: firstRent.get(c.id) ?? false,
        });
      return out;
    },
  });

  const { data: bypassed } = useQuery({
    queryKey: ["leads", "form-bypassed", bypassCandidates],
    enabled: bypassCandidates.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_activity" as any)
        .select("lead_id")
        .eq("kind", "form_bypassed")
        .in("lead_id", bypassCandidates);
      return new Set(((data ?? []) as any[]).map((r) => r.lead_id as string));
    },
  });

  const value = useMemo<Ctx>(
    () => ({
      extrasFor: (l) => ({
        ...(l.contractId ? pay?.get(l.contractId) ?? {} : {}),
        formBypassed: bypassed?.has(l.id) ?? false,
      }),
    }),
    [pay, bypassed]
  );
  return <LeadPendingCtx.Provider value={value}>{children}</LeadPendingCtx.Provider>;
};

export const useLeadPendingExtras = () => useContext(LeadPendingCtx);
