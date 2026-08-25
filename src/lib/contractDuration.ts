import { integerToWords } from "@/lib/amountToWords";

type Lang = "pt" | "en";

function completeMonths(startDate: string, endDate: string): number {
  const s = new Date(startDate);
  // A data de fim é o último dia incluído, não um limite exclusivo.
  const e = new Date(endDate);
  e.setDate(e.getDate() + 1);
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return months;
}

/**
 * Devolve a duração do contrato em meses completos, por extenso.
 * Ex: duracaoContrato("2024-01-01", "2024-06-01") → "5 (cinco) meses"
 *     duracaoContrato("2024-01-01", "2024-06-01", "en") → "5 (five) months"
 */
export function duracaoContrato(startDate: string, endDate: string, lang: Lang = "pt"): string {
  const months = completeMonths(startDate, endDate);
  const word = integerToWords(months, lang);
  const unit = lang === "pt" ? (months === 1 ? "mês" : "meses") : months === 1 ? "month" : "months";
  return `${months} (${word}) ${unit}`;
}

/** Mês(es) de compensação por denúncia antecipada, conforme a duração do contrato. */
export function compensacaoDenuncia(startDate: string, endDate: string, lang: Lang = "pt"): string {
  const months = completeMonths(startDate, endDate);
  const compensation = months <= 3 ? 1 : months <= 6 ? 2 : 3;
  const word = integerToWords(compensation, lang);
  if (lang === "en") {
    const unit = compensation === 1 ? "month's" : "months'";
    return `${compensation} (${word}) ${unit} Fee`;
  }
  const unit = compensation === 1 ? "mês" : "meses";
  return `${compensation} (${word}) ${unit} de Remuneração`;
}

/** Atalhos em inglês (mesma lógica, lang fixo). */
export const duracaoContratoEN = (startDate: string, endDate: string): string =>
  duracaoContrato(startDate, endDate, "en");

export const compensacaoDenunciaEN = (startDate: string, endDate: string): string =>
  compensacaoDenuncia(startDate, endDate, "en");
