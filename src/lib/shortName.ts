/** Primeiro e último nome (para listas). Espelha compute_short_name na BD. */
export const shortName = (full?: string | null): string => {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
};
