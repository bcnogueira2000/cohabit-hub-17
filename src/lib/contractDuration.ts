import { integerToWords } from "@/lib/amountToWords";

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
 */
export function duracaoContrato(startDate: string, endDate: string): string {
  const months = completeMonths(startDate, endDate);
  const word = integerToWords(months, "pt");
  const unit = months === 1 ? "mês" : "meses";
  return `${months} (${word}) ${unit}`;
}

/** Mês(es) de compensação por denúncia antecipada, conforme a duração do contrato. */
export function compensacaoDenuncia(startDate: string, endDate: string): string {
  const months = completeMonths(startDate, endDate);
  const compensation = months <= 3 ? 1 : months <= 6 ? 2 : 3;
  const word = integerToWords(compensation, "pt");
  const unit = compensation === 1 ? "mês" : "meses";
  return `${compensation} (${word}) ${unit} de Remuneração`;
}
