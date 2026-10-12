import { describe, it, expect } from "vitest";
import { contractEndsInDays } from "@/lib/residentEnd";
const today = new Date("2027-05-01T12:00:00Z");
describe("contractEndsInDays", () => {
  it("warns 14 days before", () => expect(contractEndsInDays("active", "2027-05-15", today)).toBe(14));
  it("no warning 15 days before", () => expect(contractEndsInDays("active", "2027-05-16", today)).toBeNull());
  it("overdue without check-out", () => expect(contractEndsInDays("active", "2027-04-29", today)).toBe(-2));
  it("ex-residents never warned", () => expect(contractEndsInDays("past", "2027-05-02", today)).toBeNull());
});
