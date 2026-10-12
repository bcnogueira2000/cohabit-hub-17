import { describe, it, expect } from "vitest";
import { docsBadge, docKindLabel, groupDocsByKind, missingDocKinds, REQUIRED_DOC_KINDS } from "@/lib/leadDocuments";

const n = { docsRequestedAt: null, docsReceivedAt: null, docsValidatedAt: null };

describe("docsBadge", () => {
  it("no request, no docs → no badge (old submitted forms count as complete)", () => expect(docsBadge(n)).toBeNull());
  it("request without reception → pedido enviado", () =>
    expect(docsBadge({ ...n, docsRequestedAt: "2026-10-01T10:00:00Z" })).toBe("requested"));
  it("new request after an older reception → pedido enviado", () =>
    expect(docsBadge({ docsRequestedAt: "2026-10-05T10:00:00Z", docsReceivedAt: "2026-10-02T10:00:00Z", docsValidatedAt: "2026-10-03T10:00:00Z" })).toBe("requested"));
  it("received, not validated → validar", () =>
    expect(docsBadge({ ...n, docsRequestedAt: "2026-10-01T10:00:00Z", docsReceivedAt: "2026-10-02T10:00:00Z" })).toBe("to_validate"));
  it("validation older than reception → validar", () =>
    expect(docsBadge({ docsRequestedAt: "2026-10-01T10:00:00Z", docsReceivedAt: "2026-10-04T10:00:00Z", docsValidatedAt: "2026-10-03T10:00:00Z" })).toBe("to_validate"));
  it("validated after reception → no badge", () =>
    expect(docsBadge({ docsRequestedAt: "2026-10-01T10:00:00Z", docsReceivedAt: "2026-10-02T10:00:00Z", docsValidatedAt: "2026-10-03T10:00:00Z" })).toBeNull());
});

describe("third document label by profile", () => {
  it("student", () => expect(docKindLabel("enrollment_or_work_proof", "student")).toBe("Comprovativo de matrícula na universidade"));
  it("worker", () => expect(docKindLabel("enrollment_or_work_proof", "professional")).toBe("Comprovativo de vínculo laboral"));
  it("nomad/other", () => expect(docKindLabel("enrollment_or_work_proof", "Nómada digital")).toBe("Comprovativo de vínculo laboral ou atividade"));
});

describe("documents", () => {
  it("all three zones are required", () =>
    expect(missingDocKinds(REQUIRED_DOC_KINDS, { id_document: [1] })).toEqual(["iban_proof", "enrollment_or_work_proof"]));
  it("null kind is grouped as other, latest first", () => {
    const g = groupDocsByKind([
      { kind: null, uploadedAt: "2026-01-01" },
      { kind: "iban_proof", uploadedAt: "2026-01-01" },
      { kind: "iban_proof", uploadedAt: "2026-02-01" },
    ]);
    expect(g.map((x) => x.kind)).toEqual(["iban_proof", "other"]);
    expect(g[0].docs[0].uploadedAt).toBe("2026-02-01");
  });
});
