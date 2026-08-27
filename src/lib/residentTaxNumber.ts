import { supabase } from "@/integrations/supabase/client";

/**
 * Verificação amigável antes de gravar: impede criar dois residentes com o mesmo NIF.
 * O índice único `residents_tax_number_unique` na base de dados é a proteção final.
 */
export async function findResidentByTaxNumber(
  taxNumber: string | null | undefined,
  excludeResidentId?: string | null
): Promise<{ id: string; full_name: string } | null> {
  const nif = String(taxNumber ?? "").trim();
  if (!nif) return null;

  let query = supabase
    .from("residents")
    .select("id, full_name")
    .eq("tax_number", nif)
    .limit(1);
  if (excludeResidentId) query = query.neq("id", excludeResidentId);

  const { data, error } = await query;
  if (error) throw error;
  return (data?.[0] as any) ?? null;
}

/** Lança um erro com mensagem clara se o NIF já pertencer a outro residente. */
export async function assertTaxNumberAvailable(
  taxNumber: string | null | undefined,
  excludeResidentId?: string | null
): Promise<void> {
  const existing = await findResidentByTaxNumber(taxNumber, excludeResidentId);
  if (existing) {
    throw new Error(`Já existe um residente com este NIF: ${existing.full_name}`);
  }
}
