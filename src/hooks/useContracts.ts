import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContractStatus = "reserved" | "active" | "terminated" | "cancelled";

export interface RentPeriod {
  id: string;
  contractId: string;
  validFrom: string;
  monthlyAmount: number;
  reason: string | null;
}

export interface ContractBalance {
  contractId: string;
  billed: number;
  received: number;
  overdue: number;
  depositHeld: number;
}

export interface Contract {
  id: string;
  residentId: string;
  residentName: string;
  leadId: string | null;
  startDate: string;
  endDate: string;
  actualEndDate: string | null;
  status: ContractStatus;
  paymentDay: number;
  autoRenew: boolean;
  depositDue: number;
  depositReceived: number;
  depositReturned: number;
  notes: string | null;
  createdAt: string;
  rentPeriods: RentPeriod[];
  /** valor do escalão em vigor (valid_from mais recente) */
  currentRent: number | null;
  balance: ContractBalance | null;
}

const mapPeriod = (p: any): RentPeriod => ({
  id: p.id,
  contractId: p.contract_id,
  validFrom: p.valid_from,
  monthlyAmount: Number(p.monthly_amount),
  reason: p.reason ?? null,
});

const mapContract = (c: any, balances: Record<string, ContractBalance>): Contract => {
  const periods = ((c.contract_rent_periods ?? []) as any[])
    .map(mapPeriod)
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));
  return {
    id: c.id,
    residentId: c.resident_id,
    residentName: c.residents?.full_name ?? "—",
    leadId: c.lead_id ?? null,
    startDate: c.start_date,
    endDate: c.end_date,
    actualEndDate: c.actual_end_date ?? null,
    status: c.status,
    paymentDay: c.payment_day,
    autoRenew: c.auto_renew,
    depositDue: Number(c.deposit_due ?? 0),
    depositReceived: Number(c.deposit_received ?? 0),
    depositReturned: Number(c.deposit_returned ?? 0),
    notes: c.notes ?? null,
    createdAt: c.created_at,
    rentPeriods: periods,
    currentRent: periods[0]?.monthlyAmount ?? null,
    balance: balances[c.id] ?? null,
  };
};

const fetchBalances = async (): Promise<Record<string, ContractBalance>> => {
  const { data, error } = await supabase.from("contract_balance" as any).select("*");
  if (error) return {};
  const out: Record<string, ContractBalance> = {};
  for (const b of (data ?? []) as any[]) {
    out[b.contract_id] = {
      contractId: b.contract_id,
      billed: Number(b.billed ?? 0),
      received: Number(b.received ?? 0),
      overdue: Number(b.overdue ?? 0),
      depositHeld: Number(b.deposit_held ?? 0),
    };
  }
  return out;
};

const SELECT =
  "*, residents:resident_id(id, full_name), contract_rent_periods(id, contract_id, valid_from, monthly_amount, reason)";

export const useContracts = () =>
  useQuery({
    queryKey: ["contracts"],
    queryFn: async (): Promise<Contract[]> => {
      const [{ data, error }, balances] = await Promise.all([
        supabase.from("contracts" as any).select(SELECT).order("start_date", { ascending: false }),
        fetchBalances(),
      ]);
      if (error) throw error;
      return ((data ?? []) as any[]).map((c) => mapContract(c, balances));
    },
  });

export const useContract = (id: string | undefined) =>
  useQuery({
    enabled: !!id,
    queryKey: ["contract", id],
    queryFn: async (): Promise<Contract | null> => {
      if (!id) return null;
      const [{ data, error }, balances] = await Promise.all([
        supabase.from("contracts" as any).select(SELECT).eq("id", id).maybeSingle(),
        fetchBalances(),
      ]);
      if (error) throw error;
      return data ? mapContract(data, balances) : null;
    },
  });

/** Estadias ligadas a um contrato */
export const useContractStays = (contractId: string | undefined) =>
  useQuery({
    enabled: !!contractId,
    queryKey: ["contract-stays", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("stays" as any)
        .select("*")
        .eq("contract_id", contractId)
        .order("check_in", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

/** Todas as estadias com contract_id, para resolver o quarto atual na lista */
export const useStaysByContract = () =>
  useQuery({
    queryKey: ["stays-by-contract"],
    queryFn: async (): Promise<Record<string, { roomId: string | null; checkIn: string }>> => {
      const { data, error } = await supabase
        .from("stays" as any)
        .select("contract_id, room_id, check_in")
        .not("contract_id", "is", null)
        .order("check_in", { ascending: false });
      if (error) throw error;
      const out: Record<string, { roomId: string | null; checkIn: string }> = {};
      for (const s of (data ?? []) as any[]) {
        if (!out[s.contract_id]) out[s.contract_id] = { roomId: s.room_id, checkIn: s.check_in };
      }
      return out;
    },
  });

/** Rendas do mês corrente (previsto / recebido / em dívida) */
export const useCurrentMonthRent = () =>
  useQuery({
    queryKey: ["rent-current-month"],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from("rent_charge_balance" as any)
        .select("amount, paid, outstanding, due_date")
        .eq("year", now.getFullYear())
        .eq("month", now.getMonth() + 1);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const today = now.toISOString().slice(0, 10);
      return {
        expected: rows.reduce((a, r) => a + Number(r.amount ?? 0), 0),
        received: rows.reduce((a, r) => a + Number(r.paid ?? 0), 0),
        overdue: rows.reduce(
          (a, r) => a + (r.due_date <= today ? Number(r.outstanding ?? 0) : 0),
          0
        ),
      };
    },
  });

/** Adenda de valor: cria um novo escalão e recalcula as rendas do contrato */
export const useAddRentPeriod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId: string;
      validFrom: string;
      monthlyAmount: number;
      reason?: string | null;
    }) => {
      const { error } = await supabase.from("contract_rent_periods" as any).insert({
        contract_id: input.contractId,
        valid_from: input.validFrom,
        monthly_amount: input.monthlyAmount,
        reason: input.reason?.trim() || null,
      } as any);
      if (error) throw error;

      const { data, error: rpcErr } = await supabase.rpc("recalculate_rent_charges" as any, {
        p_contract_id: input.contractId,
      });
      if (rpcErr) throw rpcErr;
      return (data ?? null) as RecalculationResult | null;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["rent-charges", input.contractId] });
      qc.invalidateQueries({ queryKey: ["rent-current-month"] });
      qc.invalidateQueries({ queryKey: ["contract-stays", input.contractId] });
    },
  });
};

export interface RecalculationResult {
  created: number;
  updated: number;
  deleted?: number;
  locked_count: number;
  locked: Array<{
    id: string;
    year: number;
    month: number;
    current_amount: number;
    expected_amount: number | null;
  }>;
}

/** Edição dos campos administrativos do contrato */
export const useUpdateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      startDate: string;
      endDate: string;
      paymentDay: number;
      depositDue: number;
      autoRenew: boolean;
      notes: string | null;
      endDateChanged: boolean;
      startDateChanged: boolean;
      paymentDayChanged: boolean;
      /** Mudança de quarto da estadia ligada (só permitido antes do check-in) */
      stayId?: string | null;
      newRoomId?: string | null;
    }) => {
      // Estadia ligada (antes do check-in): quarto e/ou data de entrada
      if (input.stayId && (input.newRoomId || input.startDateChanged)) {
        const stayPatch: Record<string, unknown> = {};
        if (input.newRoomId) stayPatch.room_id = input.newRoomId;
        if (input.startDateChanged) stayPatch.check_in = input.startDate;
        const { error: roomErr } = await supabase
          .from("stays" as any)
          .update(stayPatch as any)
          .eq("id", input.stayId);
        if (roomErr) {
          const code = (roomErr as any).code;
          if (code === "23P01" || /sobreposicao|overlap|exclusion/i.test(roomErr.message ?? "")) {
            throw new Error(
              "O quarto já está ocupado por outro contrato neste período. Ajusta as datas ou escolhe outro quarto — nada foi gravado."
            );
          }
          throw roomErr;
        }
      }

      const { error } = await supabase
        .from("contracts" as any)
        .update({
          start_date: input.startDate,
          end_date: input.endDate,
          payment_day: input.paymentDay,
          deposit_due: input.depositDue,
          auto_renew: input.autoRenew,
          notes: input.notes?.trim() || null,
        } as any)
        .eq("id", input.id);
      if (error) throw error;

      if (!input.endDateChanged && !input.paymentDayChanged && !input.startDateChanged) return null;

      const { data, error: rpcErr } = await supabase.rpc("recalculate_rent_charges" as any, {
        p_contract_id: input.id,
      });
      if (rpcErr) throw rpcErr;
      return (data ?? null) as RecalculationResult | null;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["contract", input.id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["rent-charges", input.id] });
      qc.invalidateQueries({ queryKey: ["rent-current-month"] });
    },
  });
};


/** Nº de pagamentos registados no contrato (salvaguarda para eliminação) */
export const useContractPaymentsCount = (contractId: string | undefined) =>
  useQuery({
    enabled: !!contractId,
    queryKey: ["contract-payments-count", contractId],
    queryFn: async (): Promise<number> => {
      if (!contractId) return 0;
      const { count, error } = await supabase
        .from("payments" as any)
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contractId);
      if (error) throw error;
      return count ?? 0;
    },
  });

/** Elimina contrato sem pagamentos: estadia ligada + contrato (cascade nas rendas) */
export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { count, error: cErr } = await supabase
        .from("payments" as any)
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contractId);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0)
        throw new Error("Este contrato já tem pagamentos registados e não pode ser eliminado.");

      const { data: contractRow, error: ctErr } = await supabase
        .from("contracts" as any)
        .select("resident_id")
        .eq("id", contractId)
        .maybeSingle();
      if (ctErr) throw ctErr;

      const { data: stays, error: sErr } = await supabase
        .from("stays" as any)
        .select("id, room_id, resident_id")
        .eq("contract_id", contractId);
      if (sErr) throw sErr;
      const rows = (stays ?? []) as any[];
      const stayIds = rows.map((s) => s.id);
      const roomIds = [...new Set(rows.map((s) => s.room_id).filter(Boolean))] as string[];
      const residentIds = [
        ...new Set(
          [...rows.map((s) => s.resident_id), (contractRow as any)?.resident_id].filter(Boolean)
        ),
      ] as string[];

      if (stayIds.length) {
        const { error: delStayErr } = await supabase.from("stays" as any).delete().in("id", stayIds);
        if (delStayErr) throw delStayErr;
      }

      const { error: delErr } = await supabase.from("contracts" as any).delete().eq("id", contractId);
      if (delErr) throw delErr;

      // Residentes sem qualquer outra estadia (em qualquer estado) são removidos
      for (const residentId of residentIds) {
        const { count: otherStays, error: osErr } = await supabase
          .from("stays" as any)
          .select("id", { count: "exact", head: true })
          .eq("resident_id", residentId);
        if (osErr) throw osErr;
        if ((otherStays ?? 0) > 0) continue;

        const { count: otherContracts, error: ocErr } = await supabase
          .from("contracts" as any)
          .select("id", { count: "exact", head: true })
          .eq("resident_id", residentId);
        if (ocErr) throw ocErr;
        if ((otherContracts ?? 0) > 0) continue;

        await supabase
          .from("rooms" as any)
          .update({ current_resident_id: null } as any)
          .eq("current_resident_id", residentId);

        const { error: delResErr } = await supabase
          .from("residents" as any)
          .delete()
          .eq("id", residentId);
        if (delResErr) throw delResErr;
      }


      // Libertar quartos que ficaram sem estadias vigentes
      for (const roomId of roomIds) {
        const { count: remaining } = await supabase
          .from("stays" as any)
          .select("id", { count: "exact", head: true })
          .eq("room_id", roomId)
          .in("status", ["confirmed", "checked_in"]);
        if ((remaining ?? 0) === 0) {
          await supabase
            .from("rooms" as any)
            .update({ status: "available", current_resident_id: null } as any)
            .eq("id", roomId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["stays"] });
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["stays-by-contract"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["rent-current-month"] });
    },
  });
};
