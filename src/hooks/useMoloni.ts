import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MoloniStatus {
  connected: boolean;
  expires_at: string | null;
  company_id: number | null;
  company_name: string | null;
  account_email: string | null;
  last_connected_at: string | null;
  has_client_credentials: boolean;
  has_password_credentials: boolean;
  callback_url: string;
  authorize_url: string | null;
}

export interface MoloniCompany {
  company_id: number;
  name: string;
  vat?: string;
}

async function callMoloniAuth<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moloni-auth", { body });
  if (error) {
    // A mensagem útil vem no corpo da resposta da função
    const detail = (data as any)?.error ?? error.message;
    throw new Error(detail);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const useMoloniStatus = () =>
  useQuery({
    queryKey: ["moloni", "status"],
    queryFn: () => callMoloniAuth<MoloniStatus>({ action: "status" }),
  });

export const useMoloniCompanies = (enabled: boolean) =>
  useQuery({
    queryKey: ["moloni", "companies"],
    queryFn: async () => {
      const res = await callMoloniAuth<{ companies: MoloniCompany[] }>({ action: "companies" });
      return res.companies ?? [];
    },
    enabled,
  });

export const useMoloniConnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callMoloniAuth({ action: "connect" }),
    onSuccess: () => {
      toast.success("Ligação ao Moloni estabelecida");
      qc.invalidateQueries({ queryKey: ["moloni"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoloniSelectCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) =>
      callMoloniAuth({ action: "select_company", company_id: companyId }),
    onSuccess: () => {
      toast.success("Empresa selecionada");
      qc.invalidateQueries({ queryKey: ["moloni"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoloniTest = () =>
  useMutation({
    mutationFn: () => callMoloniAuth<any>({ action: "test" }),
    onSuccess: (data) => {
      if (data?.company_selected) {
        toast.success(`Ligação OK — ${data.company?.name ?? "empresa"} (NIF ${data.company?.vat ?? "—"})`);
      } else {
        toast.success(`Ligação OK — ${data?.companies_found ?? 0} empresa(s) na conta. Falta selecionar.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

export const useMoloniDisconnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callMoloniAuth({ action: "disconnect" }),
    onSuccess: () => {
      toast.success("Ligação removida");
      qc.invalidateQueries({ queryKey: ["moloni"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoloniSyncLog = () =>
  useQuery({
    queryKey: ["moloni", "log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moloni_sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

/* ---------- Clientes ---------- */

export class MoloniDuplicateError extends Error {
  existingCustomerId: number | null;
  existingCustomerNumber: string | null;
  constructor(message: string, id: number | null, number: string | null) {
    super(message);
    this.name = "MoloniDuplicateError";
    this.existingCustomerId = id;
    this.existingCustomerNumber = number;
  }
}

export const useSyncMoloniCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (residentId: string) => {
      const { data, error } = await supabase.functions.invoke("moloni-sync-customer", {
        body: { resident_id: residentId },
      });
      const d = data as any;
      if (d?.needs_confirmation) {
        throw new MoloniDuplicateError(
          d.error ?? "Já existe um cliente no Moloni com este NIF.",
          d.existing_customer_id ?? null,
          d.existing_customer_number ?? null,
        );
      }
      if (error) throw new Error(d?.error ?? error.message);
      if (d?.error) throw new Error(d.error);
      return data as { customer_id: number };
    },
    onSuccess: (data, residentId) => {
      toast.success(`Cliente sincronizado no Moloni (#${data.customer_id})`);
      qc.invalidateQueries({ queryKey: ["resident", residentId] });
      qc.invalidateQueries({ queryKey: ["residents"] });
      qc.invalidateQueries({ queryKey: ["moloni", "log"] });
    },
    onError: (e: Error) => {
      if (e instanceof MoloniDuplicateError) return; // mostrado em destaque na página
      toast.error(e.message);
    },
  });
};


/* ---------- Documentos ---------- */

export const useIssueMoloniDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rentChargeId: string) => {
      const { data, error } = await supabase.functions.invoke("moloni-issue-document", {
        body: { rent_charge_id: rentChargeId },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { document_id: number; document_number: string | null };
    },
    onSuccess: (data) => {
      toast.success(`Documento emitido${data.document_number ? ` — ${data.document_number}` : ""}`);
      qc.invalidateQueries({ queryKey: ["rent-month"] });
      qc.invalidateQueries({ queryKey: ["moloni", "log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoloniDocumentPdf = () =>
  useMutation({
    mutationFn: async (rentChargeId: string) => {
      const { data, error } = await supabase.functions.invoke("moloni-issue-document", {
        body: { rent_charge_id: rentChargeId, action: "pdf" },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { url: string | null };
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank", "noopener");
      else toast.error("O Moloni não devolveu o link do PDF.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

/* ---------- Estado de pagamento ---------- */

export const useSyncMoloniPayments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rentChargeId?: string) => {
      const { data, error } = await supabase.functions.invoke("moloni-sync-payments", {
        body: rentChargeId ? { rent_charge_id: rentChargeId } : {},
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { checked: number; paid: number; errors: string[] };
    },
    onSuccess: (data) => {
      toast.success(`${data.paid} pagamento(s) importado(s) de ${data.checked} documento(s) verificado(s)`);
      if (data.errors?.length) toast.error(data.errors[0]);
      qc.invalidateQueries({ queryKey: ["rent-month"] });
      qc.invalidateQueries({ queryKey: ["charge-payments"] });
      qc.invalidateQueries({ queryKey: ["moloni", "log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
