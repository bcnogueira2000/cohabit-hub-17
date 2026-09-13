// Tradução PT → EN das nacionalidades mais comuns nos contratos.
// Se não houver correspondência, devolve o valor original em português.

const MAP: Record<string, string> = {
  portuguesa: "Portuguese",
  portugal: "Portugal",
  brasileira: "Brazilian",
  brasil: "Brazilian",
  espanhola: "Spanish",
  espanha: "Spanish",
  francesa: "French",
  franca: "French",
  italiana: "Italian",
  italia: "Italian",
  alema: "German",
  alemanha: "German",
  inglesa: "English",
  britanica: "British",
  irlandesa: "Irish",
  holandesa: "Dutch",
  neerlandesa: "Dutch",
  belga: "Belgian",
  suica: "Swiss",
  austriaca: "Austrian",
  polaca: "Polish",
  polonesa: "Polish",
  romena: "Romanian",
  ucraniana: "Ukrainian",
  russa: "Russian",
  grega: "Greek",
  turca: "Turkish",
  sueca: "Swedish",
  norueguesa: "Norwegian",
  dinamarquesa: "Danish",
  finlandesa: "Finnish",
  americana: "American",
  canadiana: "Canadian",
  mexicana: "Mexican",
  argentina: "Argentinian",
  colombiana: "Colombian",
  chilena: "Chilean",
  peruana: "Peruvian",
  venezuelana: "Venezuelan",
  chinesa: "Chinese",
  japonesa: "Japanese",
  coreana: "Korean",
  indiana: "Indian",
  paquistanesa: "Pakistani",
  nepalesa: "Nepalese",
  indonesia: "Indonesian",
  filipina: "Filipino",
  vietnamita: "Vietnamese",
  tailandesa: "Thai",
  angolana: "Angolan",
  mocambicana: "Mozambican",
  "cabo-verdiana": "Cape Verdean",
  caboverdiana: "Cape Verdean",
  "guineense": "Guinean",
  "sao-tomense": "Santomean",
  marroquina: "Moroccan",
  argelina: "Algerian",
  tunisina: "Tunisian",
  egipcia: "Egyptian",
  "sul-africana": "South African",
  nigeriana: "Nigerian",
  australiana: "Australian",
  "neozelandesa": "New Zealander",
  israelita: "Israeli",
  iraniana: "Iranian",
  libanesa: "Lebanese",
  timorense: "Timorese",
  "guineense": "Guinean",
};

const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Traduz uma nacionalidade portuguesa para inglês (fallback: valor original). */
export function nationalityToEN(nationality: string | null | undefined): string {
  const raw = String(nationality ?? "").trim();
  if (!raw) return "";
  return MAP[normalize(raw)] ?? raw;
}

/** true se a nacionalidade indicada for portuguesa. */
export function isPortuguese(nationality: string | null | undefined): boolean {
  const n = normalize(String(nationality ?? ""));
  return n === "portuguesa" || n === "portugues" || n === "portugal" || n === "portuguese";
}

const LUSOPHONE_PREFIXES = [
  "portugu", "portugal",
  "brasil", "brazil",
  "angola",
  "mocambi", "mozambi",
  "cabo verd", "cabo-verd", "caboverd", "cape verd",
  "guine", "guinea",
  "sao tom", "sao-tom", "saotom", "santom",
  "timor",
];

/**
 * true se a nacionalidade for lusófona (PT, BR, AO, MZ, CV, GW, ST, TL) —
 * nesses casos usa-se o modelo de contrato só em português.
 */
export function isLusophone(nationality: string | null | undefined): boolean {
  const n = normalize(String(nationality ?? "")).replace(/\s+/g, " ");
  if (!n) return false;
  return LUSOPHONE_PREFIXES.some((p) => n.startsWith(p) || n.includes(p));
}
