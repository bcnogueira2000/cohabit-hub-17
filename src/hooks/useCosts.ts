import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CostKind } from "@/lib/costInsights";

const db = supabase as any;

export type CostStatus = "to_classify" | "classified" | "paid";

export interface CostCategory {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  kind: CostKind;
  active: boolean;
}

export interface CostLine {
  id?: string;
  categoryCode: string | null;
  description: string | null;
  net: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  locationId: string | null;
}

export interface CostInvoice {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierNif: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  totalNet: number | null;
  totalVat: number | null;
  totalGross: number | null;
  atcud: string | null;
  notes: string | null;
  status: CostStatus;
  filePath: string;
  fileName: string;
  fileType: string;
  extractionSource: string | null;
  paidAt: string | null;
  moloniStatus: string;
  createdAt: string;
  createdByName: string | null;
  lines: CostLine[];
}

const num = (v: any) => (v == null ? null : Number(v));

const mapInvoice = (r: any): CostInvoice => ({
  id: r.id,
  supplierId: r.supplier_id,
  supplierName: r.supplier_name ?? r.suppliers?.name ?? null,
  supplierNif: r.supplier_nif,
  invoiceNumber: r.invoice_number,
  invoiceDate: r.invoice_date,
  dueDate: r.due_date,
  totalNet: num(r.total_net),
  totalVat: num(r.total_vat),
  totalGross: num(r.total_gross),
  atcud: r.atcud,
  notes: r.notes,
  status: r.status,
  filePath: r.file_path,
  fileName: r.file_name,
  fileType: r.file_type,
  extractionSource: r.extraction_source,
  paidAt: r.paid_at,
  moloniStatus: r.moloni_status,
  createdAt: r.created_at,
  createdByName: r.created_by_name,
  lines: ((r.cost_invoice_lines ?? []) as any[])
    .sort((a, b) => a.sort - b.sort)
    .map((l) => ({
      id: l.id,
      categoryCode: l.category_code,
      description: l.description,
      net: num(l.net),
      vatRate: num(l.vat_rate),
      vatAmount: num(l.vat_amount),
      locationId: l.location_id,
    })),
});

export const useCostCategories = () =>
  useQuery({
    queryKey: ["cost-categories"],
    queryFn: async (): Promise<CostCategory[]> => {
      const { data, error } = await db.from("cost_categories").select("*").order("sort");
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        code: c.code, name: c.name, groupCode: c.group_code, groupName: c.group_name, kind: c.kind, active: c.active,
      }));
    },
  });

export const useCostInvoices = () =>
  useQuery({
    queryKey: ["cost-invoices"],
    queryFn: async (): Promise<CostInvoice[]> => {
      const { data, error } = await db
        .from("cost_invoices")
        .select("*, suppliers(name), cost_invoice_lines(*)")
        .order("invoice_date", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapInvoice);
    },
  });

const sha256 = async (file: File) => {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const sanitize = (name: string) => {
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[^A-Za-z0-9]+/, "");
  const ext = (clean.split(".").pop() ?? "").toLowerCase();
  const base = clean.slice(0, Math.max(1, clean.length - ext.length - 1)).slice(0, 80) || "fatura";
  return `${base}.${ext}`;
};

const logEvent = async (invoiceId: string, action: string, details: Record<string, unknown> = {}) => {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await db.from("cost_invoice_events").insert({ invoice_id: invoiceId, user_id: u.user.id, action, details });
};

export const ALLOWED_COST_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const useUploadCostInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!ALLOWED_COST_TYPES.includes(file.type)) throw new Error("Formato não permitido. Usa PDF, JPG ou PNG.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Ficheiro acima de 10 MB.");
      const hash = await sha256(file);
      const { data: dup } = await db.from("cost_invoices").select("id, invoice_number").eq("file_hash", hash).maybeSingle();
      if (dup) throw new Error("Este ficheiro já foi carregado antes.");
      const now = new Date();
      const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}-${sanitize(file.name)}`;
      const { error: upErr } = await supabase.storage.from("cost-invoices").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("cost_invoices")
        .insert({
          file_path: path, file_name: file.name, file_hash: hash, file_type: file.type,
          status: "to_classify", currency: "EUR", created_by: u.user?.id, extraction_source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;
      await logEvent(data.id, "uploaded", { file_name: file.name });
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-invoices"] }),
  });
};

export interface ExtractedInvoice {
  supplier_name?: string | null;
  supplier_nif?: string | null;
  buyer_nif?: string | null;
  invoice_number?: string | null;
  atcud?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_net?: number | null;
  total_vat?: number | null;
  total_gross?: number | null;
  vat_rate?: number | null;
  category_code?: string | null;
  description?: string | null;
  confidence?: "low" | "high";
}

export const extractCostInvoice = async (path: string, categories: CostCategory[]): Promise<ExtractedInvoice> => {
  const { data, error } = await supabase.functions.invoke("extract-cost-invoice", {
    body: { path, categories: categories.filter((c) => c.active).map((c) => `${c.code}: ${c.groupName} / ${c.name}`) },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.data ?? {}) as ExtractedInvoice;
};

export interface SaveCostInvoiceInput {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierNif: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  atcud: string | null;
  notes: string | null;
  extractionSource?: "qr" | "ai" | "manual";
  lines: CostLine[];
  status: CostStatus;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const useSaveCostInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCostInvoiceInput) => {
      const lines = input.lines.map((l) => ({
        ...l,
        vatAmount: l.vatAmount ?? (l.net != null && l.vatRate != null ? r2((l.net * l.vatRate) / 100) : null),
      }));
      const totalNet = r2(lines.reduce((s, l) => s + (l.net ?? 0), 0));
      const totalVat = r2(lines.reduce((s, l) => s + (l.vatAmount ?? 0), 0));
      const { data: current } = await db.from("cost_invoices").select("status").eq("id", input.id).single();
      const header = {
        supplier_id: input.supplierId, supplier_name: input.supplierName, supplier_nif: input.supplierNif,
        invoice_number: input.invoiceNumber, invoice_date: input.invoiceDate, due_date: input.dueDate,
        atcud: input.atcud, notes: input.notes, total_net: totalNet, total_vat: totalVat, total_gross: r2(totalNet + totalVat),
        ...(input.extractionSource ? { extraction_source: input.extractionSource } : {}),
      };
      // Header and lines are saved while unclassified; the status change is a separate step so the DB validation sees the final lines.
      if (current?.status !== "to_classify" && current?.status !== input.status) {
        // reopen first (e.g. classified -> to_classify) before editing
      }
      const { error: hErr } = await db.from("cost_invoices").update(header).eq("id", input.id);
      if (hErr) throw hErr;
      const { error: dErr } = await db.from("cost_invoice_lines").delete().eq("invoice_id", input.id);
      if (dErr) throw dErr;
      if (lines.length) {
        const { error: lErr } = await db.from("cost_invoice_lines").insert(
          lines.map((l, i) => ({
            invoice_id: input.id, category_code: l.categoryCode, description: l.description, net: l.net,
            vat_rate: l.vatRate, vat_amount: l.vatAmount, location_id: l.locationId, sort: i,
          })),
        );
        if (lErr) throw lErr;
      }
      if (current?.status !== input.status) {
        const { error: sErr } = await db.from("cost_invoices").update({ status: input.status }).eq("id", input.id);
        if (sErr) throw sErr;
        await logEvent(input.id, `status:${input.status}`);
      } else {
        await logEvent(input.id, "edited");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-invoices"] }),
  });
};

export const useSetCostStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: CostStatus; paidAt?: string }) => {
      const patch: any = { status };
      if (status === "paid" && paidAt) patch.paid_at = paidAt;
      const { error } = await db.from("cost_invoices").update(patch).eq("id", id);
      if (error) throw error;
      await logEvent(id, `status:${status}`, paidAt ? { paid_at: paidAt } : {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cost-invoices"] }),
  });
};

export const useFindOrCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, nif }: { name: string; nif: string | null }): Promise<string> => {
      if (nif) {
        const { data } = await db.from("suppliers").select("id").eq("nif", nif).limit(1);
        if (data?.[0]) return data[0].id;
      }
      const { data, error } = await db.from("suppliers").insert({ name, nif, category: "other" }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
};

export const costFileUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from("cost-invoices").createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
};
