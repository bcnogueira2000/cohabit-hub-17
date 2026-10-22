import { describe, it, expect } from "vitest";
import { supplierReference } from "../../supabase/functions/_shared/moloniRef";

describe("supplierReference", () => {
  it("2600/000405 -> LCCOM-405", () => expect(supplierReference("1 2600/000405")).toBe("LCCOM-405"));
  it("FR 2FR/148 -> LCCOM-148", () => expect(supplierReference("FR 2FR/148")).toBe("LCCOM-148"));
  it("sem número -> null", () => expect(supplierReference("ABC")).toBeNull());
});
