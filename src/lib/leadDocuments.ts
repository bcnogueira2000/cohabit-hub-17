export type LeadDocKind = "id_document" | "iban_proof" | "enrollment_or_work_proof" | "other";

/** Zonas obrigatórias no formulário e no pedido de substituição. */
export const REQUIRED_DOC_KINDS: LeadDocKind[] = ["id_document", "iban_proof", "enrollment_or_work_proof"];

/** Máximo de ficheiros por zona (identificação: frente e verso). */
export const DOC_KIND_MAX_FILES: Record<LeadDocKind, number> = {
  id_document: 2,
  iban_proof: 1,
  enrollment_or_work_proof: 1,
  other: 1,
};

type Lang = "pt" | "en";

/** Perfil (valores do formulário ou da app) → grupo do 3.º documento. */
export const profileGroup = (profile?: string | null): "student" | "worker" | "other" => {
  const p = String(profile ?? "").trim().toLowerCase();
  if (["student", "estudante"].includes(p)) return "student";
  if (["professional", "profissional", "trabalhador", "worker"].includes(p)) return "worker";
  return "other";
};

export const docKindLabel = (kind: string | null | undefined, profile: string | null | undefined, lang: Lang = "pt") => {
  const k = (kind ?? "other") as LeadDocKind;
  if (k === "id_document") return lang === "pt" ? "Documento de identificação" : "Identity document";
  if (k === "iban_proof") return lang === "pt" ? "Comprovativo de IBAN" : "Proof of IBAN";
  if (k === "enrollment_or_work_proof") {
    const g = profileGroup(profile);
    if (g === "student") return lang === "pt" ? "Comprovativo de matrícula na universidade" : "Proof of university enrollment";
    if (g === "worker") return lang === "pt" ? "Comprovativo de vínculo laboral" : "Proof of employment";
    return lang === "pt" ? "Comprovativo de vínculo laboral ou atividade" : "Proof of employment or activity";
  }
  return lang === "pt" ? "Outros documentos" : "Other documents";
};

/** Etiqueta label da staff para os tipos (painel). */
export const docKindStaffLabel = (kind: string | null | undefined) =>
  kind === "enrollment_or_work_proof" ? "Comprovativo de matrícula / vínculo" : docKindLabel(kind, null, "pt");

export type DocsBadgeInput = {
  docsRequestedAt: string | null;
  docsReceivedAt: string | null;
  docsValidatedAt: string | null;
};

const after = (a: string | null, b: string | null) => !!a && (!b || new Date(a).getTime() > new Date(b).getTime());

/**
 * Etiqueta secundária dos documentos (não mexe na etiqueta "Pendente: …").
 * Pedido sem receção posterior → "requested"; recebidos sem validação posterior → "to_validate".
 */
export const docsBadge = (l: DocsBadgeInput): "requested" | "to_validate" | null => {
  if (after(l.docsRequestedAt, l.docsReceivedAt)) return "requested";
  if (after(l.docsReceivedAt, l.docsValidatedAt)) return "to_validate";
  return null;
};

export const DOCS_BADGE_LABEL = { requested: "Docs: pedido enviado", to_validate: "Docs: validar" } as const;

/** Agrupa por tipo (nulo = 'other'), mais recente primeiro. */
export const groupDocsByKind = <T extends { kind: string | null; uploadedAt: string }>(docs: T[]) => {
  const order: LeadDocKind[] = [...REQUIRED_DOC_KINDS, "other"];
  const map = new Map<LeadDocKind, T[]>();
  for (const d of docs) {
    const k = (order.includes(d.kind as LeadDocKind) ? d.kind : "other") as LeadDocKind;
    map.set(k, [...(map.get(k) ?? []), d]);
  }
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ kind: k, docs: map.get(k)!.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)) }));
};

/** Zonas obrigatórias sem nenhum ficheiro. */
export const missingDocKinds = (kinds: LeadDocKind[], filesByKind: Partial<Record<LeadDocKind, unknown[]>>) =>
  kinds.filter((k) => !(filesByKind[k]?.length));
