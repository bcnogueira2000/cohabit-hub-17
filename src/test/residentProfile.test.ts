import { describe, expect, it } from "vitest";
import { residentProfileValue } from "@/lib/residentProfile";

describe("resident candidate profile prefill", () => {
  it("recognizes student codes and existing Portuguese values", () => {
    expect(residentProfileValue("student")).toBe("student");
    expect(residentProfileValue("Estudante")).toBe("student");
  });
  it("recognizes worker codes and existing Portuguese values", () => {
    expect(residentProfileValue("professional")).toBe("professional");
    expect(residentProfileValue("Profissional")).toBe("professional");
    expect(residentProfileValue("Trabalhador")).toBe("professional");
  });
  it("recognizes other without replacing custom profiles", () => {
    expect(residentProfileValue("Outro")).toBe("other");
    expect(residentProfileValue("digital_nomad")).toBe("digital_nomad");
  });
  it("never invents a profile when absent", () => {
    expect(residentProfileValue(null)).toBe("");
    expect(residentProfileValue(" ")).toBe("");
  });
});