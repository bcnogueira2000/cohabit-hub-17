/** "2600/000405" -> "LCCOM-405"; "FT 148" -> "LCCOM-148". Regra: último bloco numérico, sem zeros à esquerda. */
export function supplierReference(invoiceNumber: string | null): string | null {
  if (!invoiceNumber) return null;
  const m = invoiceNumber.match(/(\d+)\D*$/);
  if (!m) return null;
  return `LCCOM-${String(Number(m[1]))}`;
}

