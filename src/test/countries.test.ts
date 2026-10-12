import { describe, it, expect } from "vitest";
import { canonicalNationality, splitPhone, joinPhone, normalizePhone } from "@/lib/countries";
import { isLusophone, nationalityToEN } from "@/lib/nationalityEN";

describe("nacionalidade", () => {
  it("formas diferentes gravam a mesma nacionalidade", () => {
    expect(canonicalNationality("Portugal")).toBe("Portuguesa");
    expect(canonicalNationality("portuguesa")).toBe("Portuguesa");
    expect(canonicalNationality("Italian")).toBe("Italiana");
    expect(canonicalNationality("Brasileiro")).toBe("Brasileira");
  });
  it("contratos continuam a traduzir e a detetar lusófonos", () => {
    expect(nationalityToEN("Alemã")).toBe("German");
    expect(isLusophone("Cabo-verdiana")).toBe(true);
    expect(isLusophone("Guineense (Guiné-Conacri)")).toBe(false);
  });
});

describe("telefone com indicativo", () => {
  it("separa indicativos escritos de várias formas", () => {
    expect(splitPhone("+351-939-378-777")).toEqual({ dial: "+351", number: "939378777" });
    expect(splitPhone("00490173 8966693")).toEqual({ dial: "+49", number: "01738966693" });
    expect(splitPhone("+447546484836")).toEqual({ dial: "+44", number: "7546484836" });
  });
  it("9 dígitos portugueses sem indicativo assumem +351", () => {
    expect(splitPhone("969208896")).toEqual({ dial: "+351", number: "969208896" });
  });
  it("grava no formato '+indicativo número'", () => {
    expect(joinPhone("+351", "912 345 678")).toBe("+351 912345678");
    expect(normalizePhone("351920310053")).toBe("+351 920310053");
  });
});
