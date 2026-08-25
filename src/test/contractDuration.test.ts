import { describe, it, expect } from "vitest";
import { duracaoContrato, compensacaoDenuncia } from "@/lib/contractDuration";

function endDate(start: string, months: number): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

const START = "2024-01-01";

describe("duracaoContrato", () => {
  const cases: [number, string][] = [
    [3, "3 (três) meses"],
    [4, "4 (quatro) meses"],
    [5, "5 (cinco) meses"],
    [6, "6 (seis) meses"],
    [7, "7 (sete) meses"],
    [12, "12 (doze) meses"],
    [24, "24 (vinte e quatro) meses"],
    [1, "1 (um) mês"],
  ];
  it.each(cases)("%i meses → %s", (months, expected) => {
    expect(duracaoContrato(START, endDate(START, months))).toBe(expected);
  });

  it("último dia do mês conta o mês completo", () => {
    expect(duracaoContrato("2026-09-01", "2027-08-31")).toBe("12 (doze) meses");
  });
});

describe("compensacaoDenuncia", () => {
  const cases: [number, string][] = [
    [3, "1 (um) mês de Remuneração"],
    [4, "2 (dois) meses de Remuneração"],
    [5, "2 (dois) meses de Remuneração"],
    [6, "2 (dois) meses de Remuneração"],
    [7, "3 (três) meses de Remuneração"],
    [12, "3 (três) meses de Remuneração"],
    [24, "3 (três) meses de Remuneração"],
  ];
  it.each(cases)("%i meses → %s", (months, expected) => {
    expect(compensacaoDenuncia(START, endDate(START, months))).toBe(expected);
  });
});
