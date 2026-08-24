// Converte valores em euros para texto por extenso (formato usado em contratos).
// Suporta 0 até 999.999,99 em português e inglês.

type Lang = "pt" | "en";

const PT_UNITS = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete",
  "dezoito", "dezenove",
];
const PT_TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const PT_HUNDREDS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

const EN_UNITS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 1..999 em português */
function ptBelowThousand(n: number): string {
  if (n === 100) return "cem";
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(PT_HUNDREDS[h]);
  if (rest > 0) {
    if (rest < 20) parts.push(PT_UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u === 0 ? PT_TENS[t] : `${PT_TENS[t]} e ${PT_UNITS[u]}`);
    }
  }
  return parts.join(" e ");
}

/** 1..999 em inglês */
function enBelowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${EN_UNITS[h]} hundred`);
  if (rest > 0) {
    let r: string;
    if (rest < 20) r = EN_UNITS[rest];
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      r = u === 0 ? EN_TENS[t] : `${EN_TENS[t]}-${EN_UNITS[u]}`;
    }
    parts.push(h > 0 ? `and ${r}` : r);
  }
  return parts.join(" ");
}

/** Inteiro 0..999999 por extenso */
export function integerToWords(n: number, lang: Lang): string {
  if (n === 0) return lang === "pt" ? "zero" : "zero";
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;

  if (lang === "pt") {
    if (thousands === 0) return ptBelowThousand(rest);
    const head = thousands === 1 ? "mil" : `${ptBelowThousand(thousands)} mil`;
    if (rest === 0) return head;
    // "e" quando o resto é < 100 ou centena redonda; caso contrário vírgula
    const sep = rest < 100 || rest % 100 === 0 ? " e " : ", ";
    return `${head}${sep}${ptBelowThousand(rest)}`;
  }

  if (thousands === 0) return enBelowThousand(rest);
  const head = `${enBelowThousand(thousands)} thousand`;
  if (rest === 0) return head;
  const sep = rest < 100 ? " and " : ", ";
  return `${head}${sep}${enBelowThousand(rest)}`;
}

/**
 * Converte um valor em euros para texto por extenso.
 * Ex: amountToWords(199.5, "pt") → "cento e noventa e nove euros e cinquenta cêntimos"
 */
export function amountToWords(amount: number, lang: Lang = "pt"): string {
  if (!Number.isFinite(amount)) return "";
  const negative = amount < 0;
  const cents = Math.round(Math.abs(amount) * 100);
  const euros = Math.floor(cents / 100);
  const rem = cents % 100;

  if (euros > 999999) {
    throw new Error("amountToWords: valores acima de 999.999,99 não são suportados");
  }

  const euroWord = lang === "pt" ? (euros === 1 ? "euro" : "euros") : euros === 1 ? "euro" : "euros";
  const centWord =
    lang === "pt" ? (rem === 1 ? "cêntimo" : "cêntimos") : rem === 1 ? "cent" : "cents";

  const parts: string[] = [];
  if (euros > 0 || rem === 0) {
    parts.push(`${integerToWords(euros, lang)} ${euroWord}`);
  }
  if (rem > 0) {
    parts.push(`${integerToWords(rem, lang)} ${centWord}`);
  }

  const joined = parts.join(lang === "pt" ? " e " : " and ");
  const prefix = negative ? (lang === "pt" ? "menos " : "minus ") : "";
  return prefix + joined;
}
