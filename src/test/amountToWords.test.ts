import { describe, it, expect } from "vitest";
import { amountToWords } from "@/lib/amountToWords";

describe("amountToWords (pt)", () => {
  const cases: [number, string][] = [
    [0, "zero euros"],
    [1, "um euro"],
    [15, "quinze euros"],
    [100, "cem euros"],
    [555, "quinhentos e cinquenta e cinco euros"],
    [750, "setecentos e cinquenta euros"],
    [1000, "mil euros"],
    [1250, "mil, duzentos e cinquenta euros"],
    [199.5, "cento e noventa e nove euros e cinquenta cêntimos"],
    [1.01, "um euro e um cêntimo"],
    [2.02, "dois euros e dois cêntimos"],
    [999999.99, "novecentos e noventa e nove mil, novecentos e noventa e nove euros e noventa e nove cêntimos"],
  ];
  it.each(cases)("%s → %s", (value, expected) => {
    expect(amountToWords(value, "pt")).toBe(expected);
  });
});

describe("amountToWords (en)", () => {
  const cases: [number, string][] = [
    [0, "zero euros"],
    [1, "one euro"],
    [15, "fifteen euros"],
    [100, "one hundred euros"],
    [555, "five hundred and fifty-five euros"],
    [750, "seven hundred and fifty euros"],
    [1000, "one thousand euros"],
    [1250, "one thousand, two hundred and fifty euros"],
    [199.5, "one hundred and ninety-nine euros and fifty cents"],
    [1.01, "one euro and one cent"],
    [999999.99, "nine hundred and ninety-nine thousand, nine hundred and ninety-nine euros and ninety-nine cents"],
  ];
  it.each(cases)("%s → %s", (value, expected) => {
    expect(amountToWords(value, "en")).toBe(expected);
  });
});
