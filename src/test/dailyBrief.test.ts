import { describe, it, expect } from "vitest";
import { buildDailyBrief, type BriefLead } from "@/lib/dailyBrief";

const now = new Date("2026-10-13T12:00:00Z");
const base: BriefLead = { id: "a", status: "negotiating", createdAt: "2026-10-01", nextActionDate: null, step: null, docs: null };

describe("buildDailyBrief", () => {
  it("taxa por pagar só entra no follow-up depois de 2 dias", () => {
    const recent = { ...base, id: "r", step: { key: "awaiting_fee" as const, since: "2026-10-12T12:00:00Z" } };
    const old = { ...base, id: "o", step: { key: "awaiting_fee" as const, since: "2026-10-10T12:00:00Z" } };
    const items = buildDailyBrief([recent, old], now);
    expect(items.find((i) => i.key === "fee_waiting")?.ids).toEqual(["o"]);
  });
  it("assinatura só entra depois de 3 dias", () => {
    const l = { ...base, step: { key: "awaiting_signature" as const, since: "2026-10-11T12:00:00Z" } };
    expect(buildDailyBrief([l], now).some((i) => i.key === "signature_waiting")).toBe(false);
  });
  it("reservada sem contrato é ação da equipa", () => {
    const l = { ...base, status: "reserved", step: { key: "awaiting_contract" as const, since: null } };
    const it0 = buildDailyBrief([l], now)[0];
    expect(it0.key).toBe("ready_contract");
    expect(it0.side).toBe("team");
  });
  it("ignora leads contratadas e perdidas", () => {
    const l = { ...base, status: "lost", docs: "to_validate" as const };
    expect(buildDailyBrief([l], now)).toEqual([]);
  });
  it("ação de hoje não está em atraso, a de ontem está", () => {
    const today = { ...base, id: "t", nextActionDate: "2026-10-13" };
    const y = { ...base, id: "y", nextActionDate: "2026-10-12" };
    expect(buildDailyBrief([today, y], now).find((i) => i.key === "overdue")?.ids).toEqual(["y"]);
  });
});
