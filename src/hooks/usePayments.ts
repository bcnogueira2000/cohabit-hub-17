import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shortName } from "@/lib/shortName";
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
  moloniDocumentId: number | null;
  moloniDocumentNumber: string | null;
  moloniStatus: string | null;
}

export const paymentStateLabels: Record<PaymentState, string> = {
  paid: "Pago",
  partial: "Parcial",
  overdue: "Em atraso",
  due: "Por pagar",
};

export const paymentKindLabels: Record<string, string> = {
  rent: "Renda",
  deposit: "Caução",
  deposit_return: "Devolução de caução",
  booking_fee: "Taxa de reserva",
  extra: "Extra",
  other: "Outro",
};
export const paymentKindLabel = (k: string | null | undefined) => (k ? paymentKindLabels[k] ?? k : "Pagamento");

/** Pagamento anulado (fica no histórico, nunca entra nas somas). */
export const isVoided = (p: { status?: string | null }) => p.status === "voided";
/** Importado do Moloni: não se anula na app. */
export const isFromMoloni = (p: { source?: string | null; notes?: string | null }) =>
  p.source === "moloni" || p.notes === "Importado do Moloni";

/** Anula um pagamento (admin/gestor), com motivo obrigatório; recalcula totais na base de dados. */
export const useVoidPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { paymentId: string; reason: string }) => {
      const { error } = await supabase.rpc("void_payment" as any, { p_payment_id: input.paymentId, p_reason: input.reason });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      for (const k of ["leads", "rent-month", "charge-payments", "contract", "contracts", "rent-current-month", "deposits",
        "deposits-to-receive", "deposit-payments", "reservation-fees", "booking-fee-payments", "contract-activity", "lead_activity", "contract-ledger", "extra-charges", "extra-charge-payments"])
        qc.invalidateQueries({ queryKey: [k] });
    },
  });
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

      const [contractsRes, staysRes, roomsRes, typRes, moloniRes] = await Promise.all([
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
        supabase
          .from("rent_charges" as any)
          .select("id, moloni_document_id, moloni_document_number, moloni_status")
          .in("id", rows.map((r) => r.id)),
      ]);

      const moloniMap: Record<string, any> = {};
      for (const m of ((moloniRes.data ?? []) as any[])) moloniMap[m.id] = m;

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
            moloniDocumentId: moloniMap[r.id]?.moloni_document_id ?? null,
            moloniDocumentNumber: moloniMap[r.id]?.moloni_document_number ?? null,
            moloniStatus: moloniMap[r.id]?.moloni_status ?? null,
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
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["rent-month"] });
      qc.invalidateQueries({ queryKey: ["charge-payments", input.rentChargeId] });
      qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["rent-current-month"] });
      qc.invalidateQueries({ queryKey: ["contract-ledger"] });
    },
  });
};

// ============ Cauções ============

export interface DepositRow {
  contractId: string;
  residentId: string | null;
  residentName: string;
  status: string;
  startDate: string;
  endDate: string;
  depositDue: number;
  depositReceived: number;
  depositReturned: number;
  depositHeld: number;
}

/** Contratos com caução por devolver (recebido > devolvido), incluindo terminados. */
export const useDeposits = () =>
  useQuery({
    queryKey: ["deposits"],
    queryFn: async (): Promise<DepositRow[]> => {
      const { data, error } = await supabase
        .from("contracts" as any)
        .select(
          "id, status, start_date, end_date, resident_id, deposit_due, deposit_received, deposit_returned, residents:resident_id(id, full_name)"
        )
        .order("end_date", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((c): DepositRow => ({
          contractId: c.id,
          residentId: c.resident_id ?? null,
          residentName: c.residents?.full_name ?? "—",
          status: c.status,
          startDate: c.start_date,
          endDate: c.end_date,
          depositDue: Number(c.deposit_due ?? 0),
          depositReceived: Number(c.deposit_received ?? 0),
          depositReturned: Number(c.deposit_returned ?? 0),
          depositHeld: Number(c.deposit_received ?? 0) - Number(c.deposit_returned ?? 0),
        }))
        .filter((r) => r.depositHeld > 0.005);
    },
  });

/** Pagamentos de caução (recebimento e devoluções) de um contrato */
export const useDepositPayments = (contractId: string | undefined) =>
  useQuery({
    enabled: !!contractId,
    queryKey: ["deposit-payments", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments" as any)
        .select("*")
        .eq("contract_id", contractId!)
        .in("kind", ["deposit", "deposit_return"])
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

/**
 * Registar devolução de caução: cria o pagamento (kind=deposit_return, valor positivo)
 * e soma ao contracts.deposit_returned já existente (suporta devoluções parciais).
 */
export const useCreateDepositReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId: string;
      amount: number;
      paidAt: string;
      method: PaymentMethod;
      reference?: string | null;
      currentReturned: number;
    }) => {
      // Atómico: cria o pagamento e recalcula os totais do contrato na mesma operação
      const { error } = await supabase.rpc("register_deposit_payment" as any, {
        p_contract_id: input.contractId,
        p_kind: "deposit_return",
        p_amount: input.amount,
        p_paid_at: input.paidAt,
        p_method: input.method,
        p_reference: input.reference?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["deposit-payments", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

/** Contratos com caução ainda por receber (recebido < devido). */
export const useDepositsToReceive = () =>
  useQuery({
    queryKey: ["deposits-to-receive"],
    queryFn: async (): Promise<DepositRow[]> => {
      const { data, error } = await supabase
        .from("contracts" as any)
        .select(
          "id, status, start_date, end_date, resident_id, deposit_due, deposit_received, deposit_returned, residents:resident_id(id, full_name)"
        )
        .order("start_date", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((c): DepositRow => ({
          contractId: c.id,
          residentId: c.resident_id ?? null,
          residentName: c.residents?.full_name ?? "—",
          status: c.status,
          startDate: c.start_date,
          endDate: c.end_date,
          depositDue: Number(c.deposit_due ?? 0),
          depositReceived: Number(c.deposit_received ?? 0),
          depositReturned: Number(c.deposit_returned ?? 0),
          depositHeld: Number(c.deposit_received ?? 0) - Number(c.deposit_returned ?? 0),
        }))
        .filter(
          (r) =>
            r.status !== "cancelled" &&
            r.depositDue > 0.005 &&
            r.depositDue - r.depositReceived > 0.005
        );
    },
  });

/** Registar recebimento de caução (kind=deposit) e somar a contracts.deposit_received. */
export const useCreateDepositReceipt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId: string;
      amount: number;
      paidAt: string;
      method: PaymentMethod;
      reference?: string | null;
      currentReceived: number;
    }) => {
      // Atómico: cria o pagamento e recalcula os totais do contrato na mesma operação
      const { error } = await supabase.rpc("register_deposit_payment" as any, {
        p_contract_id: input.contractId,
        p_kind: "deposit",
        p_amount: input.amount,
        p_paid_at: input.paidAt,
        p_method: input.method,
        p_reference: input.reference?.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["deposits"] });
      qc.invalidateQueries({ queryKey: ["deposits-to-receive"] });
      qc.invalidateQueries({ queryKey: ["deposit-payments", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
};

// ============ Taxa de reserva ============

export interface ReservationFeeRow {
  /** identificador único da linha (contrato ou lead) */
  key: string;
  source: "contract" | "lead";
  contractId: string | null;
  leadId: string | null;
  residentId: string | null;
  residentName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  feeAmount: number;
  received: number;
  outstanding: number;
  roomId: string | null;
  plannedCheckIn: string | null;
  plannedCheckOut: string | null;
  /** Lead já reservada com a taxa por pagar (ex.: pagamento anulado): o quarto continua bloqueado. */
  roomStillBlocked: boolean;
}

/** Contratos e leads com taxa de reserva definida, com o total já recebido (payments kind=booking_fee). */
export const useReservationFees = () =>
  useQuery({
    queryKey: ["reservation-fees"],
    queryFn: async (): Promise<ReservationFeeRow[]> => {
      const [{ data: contractData, error }, { data: leadData, error: leadErr }] = await Promise.all([
        supabase
          .from("contracts" as any)
          .select(
            "id, status, start_date, end_date, resident_id, reservation_fee_amount, reservation_deadline, residents:resident_id(id, full_name)"
          )
          .not("reservation_fee_amount", "is", null)
          .order("start_date", { ascending: true }),
        supabase
          .from("leads" as any)
          .select(
            "id, full_name, status, reservation_fee_amount, reservation_deadline, room_id, planned_check_in, planned_check_out, contract_id, reservation_not_applicable"
          )
          .not("reservation_fee_amount", "is", null)
          .eq("reservation_not_applicable", false)
          .order("created_at", { ascending: true }),
      ]);
      if (error) throw error;
      if (leadErr) throw leadErr;

      const contracts = ((contractData ?? []) as any[]).filter(
        (c) => Number(c.reservation_fee_amount ?? 0) > 0.005
      );
      const contractIdsWithFee = new Set(contracts.map((c) => c.id as string));
      const leadsAll = ((leadData ?? []) as any[]).filter(
        (l) =>
          Number(l.reservation_fee_amount ?? 0) > 0.005 &&
          l.room_id &&
          !l.reservation_not_applicable &&
          l.status !== "lost" &&
          // contratos com taxa própria já aparecem na linha do contrato
          !(l.contract_id && contractIdsWithFee.has(l.contract_id))
      );
      if (contracts.length === 0 && leadsAll.length === 0) return [];

      const { data: pays, error: payErr } = await supabase
        .from("payments" as any)
        .select("contract_id, lead_id, amount")
        .eq("kind", "booking_fee")
        .eq("status", "active");
      if (payErr) throw payErr;

      const paidByContract: Record<string, number> = {};
      const paidByLead: Record<string, number> = {};
      for (const p of ((pays ?? []) as any[])) {
        if (p.contract_id) paidByContract[p.contract_id] = (paidByContract[p.contract_id] ?? 0) + Number(p.amount ?? 0);
        if (p.lead_id) paidByLead[p.lead_id] = (paidByLead[p.lead_id] ?? 0) + Number(p.amount ?? 0);
      }

      const contractRows = contracts.map((c): ReservationFeeRow => {
        const feeAmount = Number(c.reservation_fee_amount ?? 0);
        const received = paidByContract[c.id] ?? 0;
        return {
          key: `contract:${c.id}`,
          source: "contract",
          contractId: c.id,
          leadId: null,
          residentId: c.resident_id ?? null,
          residentName: c.residents?.full_name ?? "—",
          status: c.status,
          startDate: c.start_date,
          endDate: c.end_date,
          deadline: c.reservation_deadline ?? null,
          feeAmount,
          received,
          outstanding: feeAmount - received,
          roomId: null,
          plannedCheckIn: null,
          plannedCheckOut: null,
          roomStillBlocked: false,
        };
      });

      // Depois de assinar (ou ganha), a lead só aparece enquanto a taxa estiver por pagar
      const leads = leadsAll.filter(
        (l) =>
          (!l.contract_id && l.status !== "won") ||
          Number(l.reservation_fee_amount ?? 0) - (paidByLead[l.id] ?? 0) > 0.005
      );
      const leadRows = leads.map((l): ReservationFeeRow => {
        const feeAmount = Number(l.reservation_fee_amount ?? 0);
        const received = paidByLead[l.id] ?? 0;
        return {
          key: `lead:${l.id}`,
          source: "lead",
          contractId: null,
          leadId: l.id,
          residentId: null,
          residentName: l.full_name ?? "—",
          status: l.status,
          startDate: l.planned_check_in ?? null,
          endDate: l.planned_check_out ?? null,
          deadline: l.reservation_deadline ?? null,
          feeAmount,
          received,
          outstanding: feeAmount - received,
          roomId: l.room_id ?? null,
          plannedCheckIn: l.planned_check_in ?? null,
          plannedCheckOut: l.planned_check_out ?? null,
          roomStillBlocked: l.status === "reserved" && feeAmount - received > 0.005,
        };
      });

      return [...leadRows, ...contractRows];
    },
  });

/** Pagamentos de taxa de reserva de um contrato ou de uma lead */
export const useBookingFeePayments = (ref: { contractId?: string | null; leadId?: string | null } | undefined) =>
  useQuery({
    enabled: !!(ref?.contractId || ref?.leadId),
    queryKey: ["booking-fee-payments", ref?.contractId ?? null, ref?.leadId ?? null],
    queryFn: async () => {
      let q = supabase.from("payments" as any).select("*").eq("kind", "booking_fee");
      q = ref?.contractId ? q.eq("contract_id", ref.contractId) : q.eq("lead_id", ref!.leadId!);
      const { data, error } = await q.order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

/** Registar recebimento de taxa de reserva (kind=booking_fee). Para leads, reserva o quarto primeiro. */
export const useCreateBookingFeePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId?: string | null;
      leadId?: string | null;
      roomId?: string | null;
      checkIn?: string | null;
      checkOut?: string | null;
      /** Lead já reservada (ex.: taxa anulada e registada de novo): não volta a reservar o quarto. */
      alreadyReserved?: boolean;
      amount: number;
      paidAt: string;
      method: PaymentMethod;
      reference?: string | null;
      notes?: string | null;
    }) => {
      let reserved = false;
      if (input.leadId && !input.alreadyReserved) {
        if (!input.roomId || !input.checkIn || !input.checkOut) {
          throw new Error(
            "Falta o quarto ou as datas previstas nesta lead. Gera primeiro o acordo de reserva com quarto e datas."
          );
        }
        const { error: rpcErr } = await supabase.rpc("reserve_room_for_lead", {
          p_lead_id: input.leadId,
          p_room_id: input.roomId,
          p_check_in: input.checkIn,
          p_check_out: input.checkOut,
        });
        if (rpcErr) throw new Error(rpcErr.message);
        reserved = true;
      }

      const { error } = await supabase.from("payments" as any).insert({
        contract_id: input.contractId ?? null,
        lead_id: input.leadId ?? null,
        kind: "booking_fee",
        amount: input.amount,
        paid_at: input.paidAt,
        method: input.method,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
      } as any);
      if (error) {
        if (reserved && input.leadId) {
          await supabase.rpc("cancel_room_reservation", { p_lead_id: input.leadId });
        }
        throw error;
      }
    },
    onSuccess: (_d, input) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["reservation-fees"] });
      qc.invalidateQueries({ queryKey: ["booking-fee-payments"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["stays"] });
      if (input.contractId) qc.invalidateQueries({ queryKey: ["contract", input.contractId] });
    },
  });
};



// ============ Conta corrente ============

/** Conta corrente (só leitura) de um contrato: vista contract_ledger, ordenada cronologicamente. */
export const useContractLedger = (contractId: string | undefined) =>
  useQuery({
    queryKey: ["contract-ledger", contractId],
    enabled: !!contractId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_ledger" as any)
        .select("*")
        .eq("contract_id", contractId!)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        contractId: r.contract_id,
        entryDate: r.entry_date,
        kind: r.kind,
        source: r.source,
        sourceId: r.source_id,
        description: r.description,
        debit: Number(r.debit ?? 0),
        credit: Number(r.credit ?? 0),
        countsInBalance: !!r.counts_in_balance,
        status: r.status,
        runningBalance: Number(r.running_balance ?? 0),
        paymentState: r.payment_state,
        paid: r.paid == null ? null : Number(r.paid),
        outstanding: r.outstanding == null ? null : Number(r.outstanding),
        method: r.method,
        reference: r.reference,
        moloniDocumentNumber: r.moloni_document_number,
        voidedAt: r.voided_at,
        voidedByName: r.voided_by_name,
        voidReason: r.void_reason,
        rentChargeId: r.rent_charge_id,
        extraChargeId: r.extra_charge_id,
      })) as import("@/lib/contractLedger").LedgerEntry[];
    },
  });

// ============ Outras receitas (serviços extra) ============

export interface ServiceItem { id: string; code: string; name: string; defaultPrice: number; unitLabel: string; active: boolean; description: string | null }

export const useServiceCatalog = () =>
  useQuery({
    queryKey: ["service-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_catalog" as any).select("*").order("sort_order");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({ id: r.id, code: r.code, name: r.name, defaultPrice: Number(r.default_price ?? 0), unitLabel: r.unit_label, active: r.active, description: r.description })) as ServiceItem[];
    },
  });

export interface ExtraChargeRow {
  id: string; contractId: string; contractCode: string | null; residentName: string; roomNumber: string | null;
  name: string; description: string | null; notes: string | null; quantity: number; unitPrice: number; unitLabel: string | null;
  amount: number; dueDate: string; status: "active" | "voided"; paid: number; outstanding: number;
  state: PaymentState | null; voidReason: string | null; voidedByName: string | null; createdByName: string | null;
}

export const useExtraCharges = () =>
  useQuery({
    queryKey: ["extra-charges"],
    queryFn: async () => {
      const [{ data, error }, { data: bal, error: e2 }] = await Promise.all([
        supabase.from("extra_charges" as any)
          .select("*, service:service_catalog(name), contract:contracts(code, resident:residents(full_name, short_name, room:rooms!residents_room_id_fkey(number)))")
          .order("due_date", { ascending: false }),
        supabase.from("extra_charge_balance" as any).select("*"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      const bm = new Map(((bal ?? []) as any[]).map((b) => [b.extra_charge_id, b]));
      return ((data ?? []) as any[]).map((r) => {
        const b: any = bm.get(r.id) ?? {};
        const res = r.contract?.resident;
        return {
          id: r.id, contractId: r.contract_id, contractCode: r.contract?.code ?? null,
          residentName: res?.short_name || res?.full_name || "—", roomNumber: res?.room?.number ?? null,
          name: r.service?.name ?? r.custom_name ?? "Extra", description: r.description, notes: r.notes,
          quantity: Number(r.quantity), unitPrice: Number(r.unit_price), unitLabel: r.unit_label, amount: Number(r.amount),
          dueDate: r.due_date, status: r.status, paid: Number(b.paid ?? 0),
          outstanding: r.status === "voided" ? 0 : Number(b.outstanding ?? r.amount),
          state: r.status === "voided" ? null : (b.payment_state ?? "due"),
          voidReason: r.void_reason, voidedByName: r.voided_by_name, createdByName: r.created_by_name,
        } as ExtraChargeRow;
      });
    },
  });

export const useExtraChargePayments = (extraChargeId: string | undefined) =>
  useQuery({
    enabled: !!extraChargeId,
    queryKey: ["extra-charge-payments", extraChargeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments" as any).select("*").eq("extra_charge_id", extraChargeId!).order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

const invalidateExtras = (qc: ReturnType<typeof useQueryClient>) => {
  for (const k of ["extra-charges", "extra-charge-payments", "contract-ledger", "contract", "contract-activity"]) qc.invalidateQueries({ queryKey: [k] });
};

export const useCreateExtraCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: {
      contractId: string; serviceId: string | null; customName?: string | null; quantity: number; unitPrice: number;
      dueDate: string; description?: string | null; notes?: string | null; payNow: boolean;
      method?: PaymentMethod | null; paidAt?: string | null; reference?: string | null;
    }) => {
      const { error } = await supabase.rpc("create_extra_charge" as any, {
        p_contract_id: i.contractId, p_service_id: i.serviceId, p_custom_name: i.customName ?? null,
        p_quantity: i.quantity, p_unit_price: i.unitPrice, p_due_date: i.dueDate,
        p_description: i.description ?? null, p_notes: i.notes ?? null, p_pay_now: i.payNow,
        p_method: i.payNow ? i.method ?? "transfer" : null, p_paid_at: i.payNow ? i.paidAt ?? null : null,
        p_reference: i.reference ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateExtras(qc),
  });
};

export const useCreateExtraPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { contractId: string; extraChargeId: string; amount: number; paidAt: string; method: PaymentMethod; reference?: string | null }) => {
      const { error } = await supabase.from("payments" as any).insert({
        contract_id: i.contractId, extra_charge_id: i.extraChargeId, kind: "extra", amount: i.amount,
        paid_at: i.paidAt, method: i.method, reference: i.reference?.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => invalidateExtras(qc),
  });
};

export const useVoidExtraCharge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { id: string; reason: string }) => {
      const { error } = await supabase.rpc("void_extra_charge" as any, { p_id: i.id, p_reason: i.reason });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidateExtras(qc),
  });
};

/** Contratos onde se podem lançar extras (ativos ou reservados). */
export const useChargeableContracts = () =>
  useQuery({
    queryKey: ["chargeable-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts" as any)
        .select("id, code, status, resident:residents(full_name, room:rooms!residents_room_id_fkey(number))")
        .in("status", ["active", "reserved"]).order("code");
      if (error) throw error;
      return ((data ?? []) as any[]).map((c) => ({
        id: c.id as string, label: `${c.resident?.full_name ? shortName(c.resident.full_name) : "—"}${c.resident?.room?.number ? ` · Q${c.resident.room.number}` : ""}`,
      }));
    },
  });

/** Cria ou edita um serviço do catálogo (nunca se apaga: desativa-se). */
export const useSaveService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { id?: string; name: string; description?: string | null; defaultPrice: number; unitLabel: string; active: boolean }) => {
      const row = { name: s.name.trim(), description: s.description?.trim() || null, default_price: s.defaultPrice, unit_label: s.unitLabel.trim() || "unidade", active: s.active };
      if (s.id) {
        const { error } = await supabase.from("service_catalog" as any).update(row as any).eq("id", s.id);
        if (error) throw error;
      } else {
        const code = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_" + Date.now().toString(36);
        const { error } = await supabase.from("service_catalog" as any).insert({ ...row, code, sort_order: 100 } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-catalog"] }),
  });
};
