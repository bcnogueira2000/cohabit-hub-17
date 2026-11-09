import { describe, expect, it } from "vitest";
import { matchesSearch } from "./listSearch";

describe("matchesSearch", () => {
  it("encontra pelo nome do residente sem acentos", () => {
    expect(matchesSearch("simon", ["Simona Ferreira", "12"])).toBe(true);
    expect(matchesSearch("joao", ["João Silva", "3"])).toBe(true);
  });

  it("encontra pelo número do quarto", () => {
    expect(matchesSearch("12", ["Salma Bennani", "12"])).toBe(true);
    expect(matchesSearch("99", ["Salma Bennani", "12"])).toBe(false);
  });

  it("combina residente e quarto na mesma pesquisa", () => {
    expect(matchesSearch("salma 12", ["Salma Bennani", "12"])).toBe(true);
    expect(matchesSearch("salma 7", ["Salma Bennani", "12"])).toBe(false);
  });

  it("pesquisa vazia mostra tudo", () => {
    expect(matchesSearch("  ", ["Qualquer", null])).toBe(true);
  });
});
