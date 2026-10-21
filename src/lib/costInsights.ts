// Pure helpers for the Costs dashboard (unit-tested in src/test/costInsights.test.ts).

export type CostKind = "opex" | "capex" | "stock";

export interface CostLineFact {
  invoiceId: string;
  invoiceDate: string | null; // YYYY-MM-DD
  supplierName: string | null;
  categoryCode: string | null;
  groupName: string | null;
  categoryName: string | null;
  kind: CostKind | null;
  locationId: string | null;
  locationName: string | null;
  net: number;
  vat: number;
}

export const lineAmount = (l: CostLineFact, withVat: boolean) =>
  Math.round(((l.net || 0) + (withVat ? l.vat || 0 : 0)) * 100) / 100;

export const monthKey = (d: string | null) => (d ? d.slice(0, 7) : null);

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const sumBy = <K extends string>(
  lines: CostLineFact[],
  key: (l: CostLineFact) => K | null,
  withVat: boolean,
) => {
  const map = new Map<K, number>();
  for (const l of lines) {
    const k = key(l);
    if (k == null) continue;
    map.set(k, round2((map.get(k) ?? 0) + lineAmount(l, withVat)));
  }
  return [...map.entries()].map(([k, v]) => ({ key: k, total: v })).sort((a, b) => b.total - a.total);
};

/** Monthly totals per kind for the N months ending at `endKey` (inclusive). */
export const monthlySeries = (lines: CostLineFact[], endKey: string, months: number, withVat: boolean) => {
  const keys = Array.from({ length: months }, (_, i) => shiftMonth(endKey, i - months + 1));
  return keys.map((k) => {
    const row = { month: k, opex: 0, capex: 0, stock: 0, total: 0 };
    for (const l of lines) {
      if (monthKey(l.invoiceDate) !== k) continue;
      const a = lineAmount(l, withVat);
      const kind = l.kind ?? "opex";
      row[kind] = round2(row[kind] + a);
      row.total = round2(row.total + a);
    }
    return row;
  });
};

export interface CostInsight {
  tone: "up" | "down" | "info";
  text: string;
}

/**
 * Category deviations: compares the month's opex per category against the
 * average of the 3 previous months. Flags changes of at least 25% and 50 €.
 */
export const categoryDeviations = (lines: CostLineFact[], key: string, withVat: boolean): CostInsight[] => {
  const prev = [1, 2, 3].map((i) => shiftMonth(key, -i));
  const cur = new Map<string, number>();
  const past = new Map<string, number>();
  for (const l of lines) {
    if (l.kind && l.kind !== "opex") continue;
    const name = l.categoryName;
    if (!name) continue;
    const mk = monthKey(l.invoiceDate);
    const a = lineAmount(l, withVat);
    if (mk === key) cur.set(name, (cur.get(name) ?? 0) + a);
    else if (mk && prev.includes(mk)) past.set(name, (past.get(name) ?? 0) + a);
  }
  const out: { pct: number; insight: CostInsight }[] = [];
  for (const [name, value] of cur) {
    const avg = (past.get(name) ?? 0) / 3;
    if (avg <= 0) continue;
    const diff = value - avg;
    const pct = diff / avg;
    if (Math.abs(pct) >= 0.25 && Math.abs(diff) >= 50) {
      const p = Math.round(pct * 100);
      out.push({
        pct: Math.abs(pct),
        insight: {
          tone: p > 0 ? "up" : "down",
          text: `${name} ${p > 0 ? "subiu" : "desceu"} ${Math.abs(p)}% face à média dos 3 meses anteriores`,
        },
      });
    }
  }
  return out.sort((a, b) => b.pct - a.pct).map((o) => o.insight);
};

export const pctChange = (current: number, previous: number): number | null =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
