import { describe, it, expect } from "vitest";
import { categoryDeviations, monthlySeries, shiftMonth, sumBy, pctChange, type CostLineFact } from "@/lib/costInsights";

const line = (p: Partial<CostLineFact>): CostLineFact => ({
  invoiceId: "i", invoiceDate: "2026-10-05", supplierName: "EDP", categoryCode: "LC2UTI_ELECT_EDIF",
  groupName: "Utilities", categoryName: "Eletricidade", kind: "opex", locationId: null, locationName: null,
  net: 100, vat: 23, ...p,
});

describe("costInsights", () => {
  it("shifts months across years", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("separates opex and capex per month", () => {
    const s = monthlySeries([line({}), line({ kind: "capex", net: 500, vat: 0 })], "2026-10", 2, false);
    expect(s[1]).toMatchObject({ month: "2026-10", opex: 100, capex: 500, total: 600 });
    expect(s[0].total).toBe(0);
  });

  it("includes VAT only when asked", () => {
    expect(sumBy([line({})], (l) => l.groupName, true)[0].total).toBe(123);
    expect(sumBy([line({})], (l) => l.groupName, false)[0].total).toBe(100);
  });

  it("flags a 25%+ and 50 €+ rise against the 3-month average", () => {
    const past = ["2026-07-01", "2026-08-01", "2026-09-01"].map((d) => line({ invoiceDate: d, net: 200, vat: 0 }));
    const res = categoryDeviations([...past, line({ net: 300, vat: 0 })], "2026-10", false);
    expect(res[0].text).toContain("subiu 50%");
  });

  it("ignores small absolute changes and capex", () => {
    const past = ["2026-07-01", "2026-08-01", "2026-09-01"].map((d) => line({ invoiceDate: d, net: 40, vat: 0 }));
    expect(categoryDeviations([...past, line({ net: 80, vat: 0 })], "2026-10", false)).toHaveLength(0);
    const cap = ["2026-07-01", "2026-10-01"].map((d) => line({ invoiceDate: d, net: 1000, kind: "capex" }));
    expect(categoryDeviations(cap, "2026-10", false)).toHaveLength(0);
  });

  it("returns null change without a previous value", () => {
    expect(pctChange(100, 0)).toBeNull();
    expect(pctChange(150, 100)).toBe(50);
  });
});
