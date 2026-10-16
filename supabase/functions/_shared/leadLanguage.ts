// Emails a candidatos: português para países lusófonos (Portugal, Brasil e PALOP), inglês para os restantes.
const norm = (s: unknown) =>
  String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const LUSO_PREFIXES = [
  "portugu", "portugal", "brasil", "brazil", "angola", "mocambi", "mozambi",
  "cabo verd", "cabo-verd", "caboverd", "cape verd", "guine-bissau", "guineense",
  "bissau", "sao tom", "sao-tom", "saotom", "santom", "timor",
];
const LUSO_DIALS = ["+351", "+55", "+244", "+258", "+238", "+245", "+239", "+670"];

/** true = enviar em português. Usa a nacionalidade; sem ela, o indicativo do telefone; sem ambos, a língua da lead. */
export function isPortugueseRecipient(lead: { nationality?: string | null; phone?: string | null; language?: string | null }): boolean {
  const n = norm(lead.nationality);
  if (n) {
    if (n.includes("conacri") || n.includes("equatorial")) return false;
    return LUSO_PREFIXES.some((p) => n.includes(p));
  }
  const phone = String(lead.phone ?? "").replace(/\s|-/g, "").replace(/^00/, "+");
  if (phone.startsWith("+")) return LUSO_DIALS.some((d) => phone.startsWith(d));
  return norm(lead.language) !== "en";
}
