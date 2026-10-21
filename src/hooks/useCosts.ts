import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extractInvoiceQrText } from "@/lib/invoiceQr";
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
  extractionConfidence: Record<string, "low" | "high"> | null;
  paidAt: string | null;
  moloniStatus: string;
  createdAt: string;
  createdByName: string | null;
  classifiedByName: string | null;
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
  extractionConfidence: (r.extraction_confidence as CostInvoice["extractionConfidence"]) ?? null,
  paidAt: r.paid_at,
  moloniStatus: r.moloni_status,
  createdAt: r.created_at,
  createdByName: r.created_by_name,
  classifiedByName: r.classified_by_name,
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

export interface CostInvoiceEvent {
  id: string;
  action: string;
  userName: string | null;
  createdAt: string;
  details: Record<string, any>;
}

export const useCostInvoiceEvents = (invoiceId: string | undefined) =>
  useQuery({
    enabled: !!invoiceId,
    queryKey: ["cost-invoice-events", invoiceId],
    queryFn: async (): Promise<CostInvoiceEvent[]> => {
      const { data, error } = await db
        .from("cost_invoice_events")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((e: any) => ({
        id: e.id, action: e.action, userName: e.user_name, createdAt: e.created_at, details: e.details ?? {},
      }));
    },
  });

const sha256 = async (file: File) => {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const sanitize = (name: string) => {
  const clean = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[^A-Za-z0-9]+/, "");
  const ext = (clean.split(".").pop() ?? "").toLowerCase();
  const base = clean.slice(0, Math.max(1, clean.length - ext.length - 1)).slice(0, 80) || "fatura";
  return `${base}.${ext}`;
};

export const ALLOWED_COST_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export type UploadOutcome =
  | { state: "done"; id: string }
  | { state: "duplicate" }
  | { state: "failed"; message: string };

/** Carrega o ficheiro, cria a fatura e lê-a automaticamente (QR + leitura inteligente). */
export const uploadAndReadCostInvoice = async (file: File, onPhase?: (p: "uploading" | "reading") => void): Promise<UploadOutcome> => {
  if (!ALLOWED_COST_TYPES.includes(file.type)) return { state: "failed", message: "Formato não permitido. Usa PDF, JPG ou PNG." };
  if (file.size > 10 * 1024 * 1024) return { state: "failed", message: "Ficheiro acima de 10 MB." };
  onPhase?.("uploading");
  const hash = await sha256(file);
  const { data: dup } = await db.from("cost_invoices").select("id").eq("file_hash", hash).maybeSingle();
  if (dup) return { state: "duplicate" };
  const now = new Date();
  const path = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}-${sanitize(file.name)}`;
  const { error: upErr } = await supabase.storage.from("cost-invoices").upload(path, file, { contentType: file.type });
  if (upErr) return { state: "failed", message: upErr.message };
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await db
    .from("cost_invoices")
    .insert({
      file_path: path, file_name: file.name, file_hash: hash, file_type: file.type,
      status: "to_classify", currency: "EUR", created_by: u.user?.id, extraction_source: "manual",
    })
    .select("id")
    .single();
  if (error) return { state: "failed", message: error.message };
  // Leitura automática: falhas aqui não impedem o carregamento — a fatura fica para leitura manual.
  onPhase?.("reading");
  try {
    await autoReadInvoice(data.id as string, path, file);
  } catch { /* fica por ler */ }
  return { state: "done", id: data.id as string };
};

const CONF_KEYS = ["supplier_name", "supplier_nif", "invoice_number", "invoice_date", "due_date", "total_net", "total_vat", "total_gross", "vat_rate", "category_code"] as const;

export interface ExtractionResult {
  data: ExtractedInvoice;
  uncertain: string[];
  source: "qr" | "ai";
}

/** Lê uma fatura já carregada e pré-preenche cabeçalho e linha sugerida na base de dados. */
export const autoReadInvoice = async (id: string, path: string, file?: File): Promise<ExtractionResult> => {
  const qrText = file ? await extractInvoiceQrText(file) : null;
  const { data: catRows } = await db.from("cost_categories").select("code, group_name, name").eq("active", true);
  const categories = (catRows ?? []).map((c: any) => `${c.code}: ${c.group_name} / ${c.name}`);
  const { data: resp, error } = await supabase.functions.invoke("extract-cost-invoice", {
    body: { path, categories, qr_text: qrText },
  });
  if (error) throw error;
  if (resp?.error) throw new Error(resp.error);
  const result: ExtractionResult = { data: resp?.data ?? {}, uncertain: resp?.uncertain ?? [], source: resp?.source ?? "ai" };
  const d = result.data;
  const nif = d.supplier_nif?.replace(/\D/g, "") || null;
  let supplierId: string | null = null;
  let supplierName = d.supplier_name ?? null;
  if (nif) {
    const { data: s } = await db.from("suppliers").select("id, name").eq("nif", nif).limit(1);
    if (s?.[0]) { supplierId = s[0].id; supplierName = s[0].name; }
  }
  const confidence: Record<string, "low" | "high"> = {};
  for (const k of CONF_KEYS) {
    if ((d as any)[k] != null) confidence[k] = result.uncertain.includes(k) ? "low" : "high";
  }
  await db.from("cost_invoices").update({
    supplier_id: supplierId, supplier_name: supplierName, supplier_nif: nif,
    invoice_number: d.invoice_number ?? null, invoice_date: d.invoice_date ?? null,
    due_date: d.due_date ?? d.invoice_date ?? null, atcud: d.atcud ?? null,
    total_net: d.total_net ?? null, total_vat: d.total_vat ?? null, total_gross: d.total_gross ?? null,
    extraction_source: result.source, extraction_confidence: confidence,
  }).eq("id", id);
  const { count } = await db.from("cost_invoice_lines").select("id", { count: "exact", head: true }).eq("invoice_id", id);
  if (!count) {
    const cat = d.category_code && (catRows ?? []).some((c: any) => c.code === d.category_code) ? d.category_code : null;
    await db.from("cost_invoice_lines").insert({
      invoice_id: id, category_code: cat, description: d.description ?? null,
      net: d.total_net ?? null, vat_rate: d.vat_rate ?? 23, vat_amount: d.total_vat ?? null, location_id: null, sort: 0,
    });
  }
  return result;
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

export const extractCostInvoice = async (path: string, categories: CostCategory[], qrText?: string | null): Promise<ExtractionResult> => {
  const { data, error } = await supabase.functions.invoke("extract-cost-invoice", {
    body: { path, categories: categories.filter((c) => c.active).map((c) => `${c.code}: ${c.groupName} / ${c.name}`), qr_text: qrText ?? null },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { data: data?.data ?? {}, uncertain: data?.uncertain ?? [], source: data?.source ?? "ai" };
};

/** Procura outra fatura com o mesmo NIF de fornecedor e número (deteção de duplicados). */
export const findDuplicateInvoice = async (nif: string | null, number: string | null, excludeId: string) => {
  const cleanNif = nif?.replace(/\D/g, "") || "";
  const cleanNum = number?.trim() || "";
  if (!cleanNif || !cleanNum) return null;
  const { data } = await db
    .from("cost_invoices")
    .select("id, supplier_name, invoice_number, invoice_date, total_gross, status")
    .eq("supplier_nif", cleanNif)
    .ilike("invoice_number", cleanNum)
    .neq("id", excludeId)
    .limit(1);
  return (data?.[0] as any) ?? null;
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
  /** Obrigatória quando status = "paid". */
  paidAt?: string | null;
  /** Guarda categoria/IVA/espaço da primeira linha como predefinições do fornecedor. */
  saveSupplierDefaults?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export const useSaveCostInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveCostInvoiceInput) => {
      if (input.status === "paid" && !input.paidAt) throw new Error("Indica a data de pagamento.");
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
        const patch: any = { status: input.status };
        if (input.status === "paid") patch.paid_at = input.paidAt;
        const { error: sErr } = await db.from("cost_invoices").update(patch).eq("id", input.id);
        if (sErr) throw sErr;
      }
      if (input.saveSupplierDefaults && input.supplierId && lines[0]) {
        await db.from("suppliers").update({
          default_category_code: lines[0].categoryCode, default_vat_rate: lines[0].vatRate, default_location_id: lines[0].locationId,
        }).eq("id", input.supplierId);
        qc.invalidateQueries({ queryKey: ["suppliers"] });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cost-invoices"] });
      qc.invalidateQueries({ queryKey: ["cost-invoice-events", vars.id] });
    },
  });
};

export const useSetCostStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: CostStatus; paidAt?: string }) => {
      const patch: any = { status };
      if (status === "paid") patch.paid_at = paidAt ?? new Date().toISOString().slice(0, 10);
      const { error } = await db.from("cost_invoices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["cost-invoices"] });
      qc.invalidateQueries({ queryKey: ["cost-invoice-events", vars.id] });
    },
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

/** URL assinada com Content-Disposition: attachment, para descarregar o ficheiro. */
export const costFileDownloadUrl = async (path: string, fileName: string) => {
  const { data, error } = await supabase.storage
    .from("cost-invoices")
    .createSignedUrl(path, 60, { download: fileName });
  if (error) throw error;
  return data.signedUrl;
};
