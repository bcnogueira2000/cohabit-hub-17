import { describe, it, expect } from "vitest";
import { shortName } from "@/lib/shortName";
describe("shortName", () => {
  it("first and last", () => expect(shortName("Ana Maria Costa Silva")).toBe("Ana Silva"));
  it("two names unchanged", () => expect(shortName("Ana Silva")).toBe("Ana Silva"));
  it("one name", () => expect(shortName(" Ana ")).toBe("Ana"));
});
