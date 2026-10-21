// Parser do conteúdo do QR code fiscal português (AT). Puro, sem dependências,
// partilhado pela edge function e pelos testes do cliente.

export interface PtQrVatLine {
  rate: number; // 0 (isento), 6, 13, 23 ou outra
  base: number;
  vat: number;
}

export interface PtQrData {
  supplier_nif: string | null;
  buyer_nif: string | null;
  invoice_number: string | null;
  invoice_date: string | null; // YYYY-MM-DD
  atcud: string | null;
  total_net: number | null;
  total_vat: number | null;
  total_gross: number | null;
  vat_rate: number | null; // taxa com maior peso de IVA
  vat_lines: PtQrVatLine[];
}

const num = (s: string | undefined): number | null => {
  if (s == null || s === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const REGION_RATES: Record<string, [string, string][]> = {
  // [baseKey, vatKey] por taxa, para Portugal continental (I), Madeira (J) e Açores (K)
  I: [["I2", ""], ["I3", "I4"], ["I5", "I6"], ["I7", "I8"]],
  J: [["J1", ""], ["J2", "J3"], ["J4", "J5"], ["J6", "J7"]],
  K: [["K1", ""], ["K2", "K3"], ["K4", "K5"], ["K6", "K7"]],
};
const RATES = [0, 6, 13, 23];

/** Extrai e valida o texto do QR a partir de um texto lido por um leitor qualquer. */
export const findQrText = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const t = raw.trim();
  // O QR fiscal tem sempre o formato CHAVE:VALOR*CHAVE:VALOR…
  return /^[A-Z][0-9]?:[^*]*(\*[A-Z][0-9]?:[^*]*){4,}$/.test(t) ? t : null;
};

export const parsePtQr = (raw: string | null | undefined): PtQrData | null => {
  const text = findQrText(raw);
  if (!text) return null;
  const f = new Map<string, string>();
  for (const part of text.split("*")) {
    const i = part.indexOf(":");
    if (i > 0) f.set(part.slice(0, i), part.slice(i + 1));
  }
  const supplierNif = f.get("A")?.replace(/\D/g, "") || null;
  if (!supplierNif) return null; // sem NIF de emissor não é QR fiscal válido

  const dateRaw = f.get("F") ?? "";
  const invoiceDate = /^\d{8}$/.test(dateRaw)
    ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
    : null;

  const vatLines: PtQrVatLine[] = [];
  for (const region of Object.values(REGION_RATES)) {
    region.forEach(([baseKey, vatKey], idx) => {
      const base = num(f.get(baseKey));
      if (base == null) return;
      const rate = RATES[idx] ?? 0;
      const vat = vatKey ? num(f.get(vatKey)) ?? Math.round((base * rate) / 100 * 100) / 100 : 0;
      vatLines.push({ rate, base, vat });
    });
  }

  const totalVat = num(f.get("N"));
  const totalGross = num(f.get("O"));
  const bases = vatLines.reduce((s, l) => s + l.base, 0);
  const totalNet = totalGross != null && totalVat != null
    ? Math.round((totalGross - totalVat) * 100) / 100
    : vatLines.length ? Math.round(bases * 100) / 100 : null;

  const main = [...vatLines].sort((a, b) => b.vat - a.vat || b.base - a.base)[0];

  return {
    supplier_nif: supplierNif,
    buyer_nif: f.get("B")?.replace(/\D/g, "") || null,
    invoice_number: f.get("G") || null,
    invoice_date: invoiceDate,
    atcud: f.get("H") || null,
    total_net: totalNet,
    total_vat: totalVat,
    total_gross: totalGross,
    vat_rate: main ? main.rate : null,
    vat_lines: vatLines,
  };
};

/** Funde o QR (fonte de verdade fiscal) com a leitura inteligente; devolve também os campos incertos. */
export const mergeQrWithAi = <T extends Record<string, any>>(
  qr: PtQrData | null,
  ai: T,
): { data: Record<string, any>; uncertain: string[]; source: "qr" | "ai" } => {
  const out: Record<string, any> = { ...ai };
  const uncertain: string[] = [];
  if (!qr) {
    if (ai?.confidence === "low") {
      for (const k of ["supplier_name", "supplier_nif", "invoice_number", "invoice_date", "due_date", "total_net", "total_vat", "total_gross"]) {
        if (ai?.[k] != null) uncertain.push(k);
      }
    }
    return { data: out, uncertain, source: "ai" };
  }
  const fiscal: (keyof PtQrData)[] = ["supplier_nif", "invoice_number", "invoice_date", "atcud", "total_net", "total_vat", "total_gross", "vat_rate"];
  for (const k of fiscal) {
    const qv = qr[k as keyof PtQrData];
    if (qv == null) continue;
    const av = (ai as any)[k];
    if (av != null && String(av) !== String(qv)) uncertain.push(k);
    out[k] = qv; // o QR ganha sempre nos campos fiscais
  }
  if (ai?.confidence === "low") {
    for (const k of ["supplier_name", "due_date", "category_code", "description"]) {
      if (ai?.[k] != null) uncertain.push(k);
    }
  }
  return { data: out, uncertain: [...new Set(uncertain)], source: "qr" };
};
