/** Normaliza texto para pesquisa: minúsculas e sem acentos. */
export const normalizeSearch = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Pesquisa em listas (residente, quarto…): cada palavra escrita tem de aparecer
 * em pelo menos um dos campos, ignorando maiúsculas e acentos. Vazio = tudo.
 */
export const matchesSearch = (query: string, fields: Array<string | null | undefined>) => {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.filter(Boolean).map((f) => normalizeSearch(String(f)));
  return words.every((w) => haystack.some((h) => h.includes(w)));
};
