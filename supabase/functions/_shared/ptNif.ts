/** Valida um NIF português (9 dígitos + dígito de controlo). O placeholder 999999990 não conta como NIF real. */
export function isValidPtNif(raw: string | null | undefined): boolean {
  const nif = String(raw ?? "").replace(/\s/g, "");
  if (!/^[1-9]\d{8}$/.test(nif)) return false;
  if (nif === "999999990") return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return check === Number(nif[8]);
}

/** Próximo número de ficha: "LC0014" com 1 ficha anterior -> "LC0014-2"; com 2 -> "LC0014-3". */
export function nextCustomerNumber(code: string, existingNumbers: (string | null)[]): string {
  let max = 1;
  for (const n of existingNumbers) {
    if (!n) continue;
    if (n === code) continue;
    const m = n.match(new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${code}-${max + 1}`;
}
