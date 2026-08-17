import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PaymentState = "paid" | "partial" | "overdue" | "due";
export type PaymentMethod = "transfer" | "mbway" | "direct_debit" | "card" | "cash" | "other";

export interface RentChargeRow {
  id: string;
  contractId: string;
  year: number;
  month: number;
  amount: number;
  paid: number;
  outstanding: number;
  state: PaymentState;
  dueDate: string;
  prorated: boolean;
  residentId: string | null;
  residentName: string;
  roomId: string | null;
  roomNumber: string | null;
  typologyId: string | null;
  typologyName: string | null;
}

export const paymentStateLabels: Record<PaymentState, string> = {
  paid: "Pago",
  partial: "Parcial",
  overdue: "Em atraso",
  due: "Por pagar",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  transfer: "Transferência",
  mbway: "MB Way",
  direct_debit: "Débito direto",
  card: "Cartão",
  cash: "Dinheiro",
  other: "Outro",
};

/** Mapa mensal de rendas: vista rent_charge_balance enriquecida com residente e quarto. */
export const useRentMonth = (year: number, month: number) =>
  useQuery({
    queryKey: ["rent-month", year, month],
    queryFn: async (): Promise<RentChargeRow[]> => {
      const { data: charges, error } = await supabase
        .from("rent_charge_balance" as any)
        .select("*")
        .eq("year", year)
        .eq("month", month);
      if (error) throw error;
      const rows = (charges ?? []) as any[];
      if (rows.length === 0) return [];

      const contractIds = Array.from(new Set(rows.map((r) => r.contract_id)));

      const [contractsRes, staysRes, roomsRes, typRes] = await Promise.all([
        supabase
          .from("contracts" as any)
          .select("id, resident_id, residents:resident_id(id, full_name)")
          .in("id", contractIds),
        supabase
          .from("stays" as any)
          .select("contract_id, room_id, check_in")
          .in("contract_id", contractIds)
          .order("check_in", { ascending: false }),
        supabase.from("rooms" as any).select("id, number, typology, typology_id"),
        supabase.from("room_typologies" as any).select("id, name"),
      ]);

      const contractMap: Record<string, { residentId: string | null; residentName: string }> = {};
      for (const c of ((contractsRes.data ?? []) as any[])) {
        contractMap[c.id] = {
          residentId: c.resident_id ?? null,
          residentName: c.residents?.full_name ?? "—",
        };
      }

      const roomByContract: Record<string, string | null> = {};
      for (const s of ((staysRes.data ?? []) as any[])) {
        if (!(s.contract_id in roomByContract)) roomByContract[s.contract_id] = s.room_id ?? null;
      }

      const roomMap: Record<string, any> = {};
      for (const r of ((roomsRes.data ?? []) as any[])) roomMap[r.id] = r;

      const typMap: Record<string, string> = {};
      for (const t of ((typRes.data ?? []) as any[])) typMap[t.id] = t.name;

      return rows
        .map((r): RentChargeRow => {
          const contract = contractMap[r.contract_id];
          const roomId = roomByContract[r.contract_id] ?? null;
          const room = roomId ? roomMap[roomId] : null;
          return {
            id: r.id,
            contractId: r.contract_id,
            year: r.year,
            month: r.month,
            amount: Number(r.amount ?? 0),
            paid: Number(r.paid ?? 0),
            outstanding: Number(r.outstanding ?? 0),
            state: r.payment_state as PaymentState,
            dueDate: r.due_date,
            prorated: !!r.prorated,
            residentId: contract?.residentId ?? null,
            residentName: contract?.residentName ?? "—",
            roomId: room?.id ?? null,
            roomNumber: room?.number ?? null,
            typologyId: room?.typology_id ?? null,
            typologyName: room?.typology_id
              ? typMap[room.typology_id] ?? room?.typology ?? null
              : room?.typology ?? null,
          };
        })
        .sort((a, b) => a.residentName.localeCompare(b.residentName, "pt"));
    },
  });

export const useTypologies = () =>
  useQuery({
    queryKey: ["room-typologies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_typologies" as any)
        .select("id, name, sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[] as { id: string; name: string; sort_order: number }[];
    },
  });

/** Pagamentos já registados numa renda */
export const useChargePayments = (rentChargeId: string | undefined) =>
  useQuery({
    enabled: !!rentChargeId,
    queryKey: ["charge-payments", rentChargeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments" as any)
        .select("*")
        .eq("rent_charge_id", rentChargeId!)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId: string;
      rentChargeId: string;
      amount: number;
      paidAt: string;
      method: PaymentMethod;
      reference?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("payments" as any).insert({
        contract_id: input.contractId,
        rent_charge_id: input.rentChargeId,
        kind: "rent",
        amount: input.amount,
        paid_at: input.paidAt,
        method: input.method,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["rent-month"] });
      qc.invalidateQueries({ queryKey: ["charge-payments", input.rentChargeId] });
      qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["rent-current-month"] });
    },
  });
};
