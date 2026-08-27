// Definições da integração Moloni guardadas em public.app_settings.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadCredentials, moloniCall } from "./moloni.ts";

export interface MoloniSettings {
  companyId: number;
  documentType: "invoices" | "invoiceReceipts";
  documentSetId: number | null;
  taxId: number | null;
  exemptionReason: string;
  productId: number | null;
  productName: string;
  unitId: number | null;
}

const KEYS = [
  "moloni_document_type",
  "moloni_document_set_id",
  "moloni_tax_id",
  "moloni_exemption_reason",
  "moloni_product_id",
  "moloni_product_name",
  "moloni_unit_id",
] as const;

export async function loadSettings(sb: SupabaseClient): Promise<MoloniSettings> {
  const creds = await loadCredentials(sb);
  if (!creds?.company_id) {
    throw new Error("Nenhuma empresa Moloni selecionada. Configura a ligação em Financeiro › Moloni.");
  }

  const { data } = await sb.from("app_settings").select("key, value").in("key", KEYS as unknown as string[]);
  const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const num = (k: string) => {
    const v = map.get(k);
    return v ? Number(v) : null;
  };

  let documentSetId = num("moloni_document_set_id");
  if (!documentSetId) {
    // Usa o primeiro conjunto de documentos da empresa
    const sets = await moloniCall<any[]>(sb, "documentSets/getAll", { company_id: creds.company_id });
    documentSetId = sets?.[0]?.document_set_id ?? null;
    if (documentSetId) {
      await sb
        .from("app_settings")
        .upsert({ key: "moloni_document_set_id", value: String(documentSetId) }, { onConflict: "key" });
    }
  }

  const type = map.get("moloni_document_type");
  return {
    companyId: creds.company_id,
    documentType: type === "invoices" ? "invoices" : "invoiceReceipts",
    documentSetId,
    taxId: num("moloni_tax_id"),
    exemptionReason: map.get("moloni_exemption_reason") ?? "M07",
    productId: num("moloni_product_id"),
    productName: map.get("moloni_product_name") ?? "Renda mensal",
    unitId: num("moloni_unit_id"),
  };
}
