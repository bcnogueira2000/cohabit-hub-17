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
