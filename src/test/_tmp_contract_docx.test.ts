import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { generateContractDocx } from "@/lib/generateContractDocx";
import PizZip from "pizzip";

const IARA_CONTRACT_ID = "3586d0a4-bd4e-4cca-a017-46aaf8270c72";
const PATRICIA_CONTRACT_ID = "1520a140-64f4-4c1e-8d18-e39156759603";
const PATRICIA_RESIDENT_ID = "7fc344d4-fa1a-453a-8ac0-babe3314832e";

async function extractDocxText(signedUrl: string): Promise<string> {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error(`Failed to download docx: ${res.status}`);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const documentXml = zip.files["word/document.xml"];
  if (!documentXml) throw new Error("word/document.xml not found");
  const text = documentXml.asText();
  // Strip XML tags
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

describe("contract docx generation - Perfil_Profissional", () => {
  const originalPatricia: Record<string, any> = {};

  beforeAll(async () => {
    const { data, error } = await supabase
      .from("residents")
      .select("profile, employer_or_school, address, document_validity")
      .eq("id", PATRICIA_RESIDENT_ID)
      .single();
    if (error) throw error;
    Object.assign(originalPatricia, data);
  });

  afterAll(async () => {
    await supabase
      .from("residents")
      .update({
        profile: originalPatricia.profile,
        employer_or_school: originalPatricia.employer_or_school,
        address: originalPatricia.address,
        document_validity: originalPatricia.document_validity,
      })
      .eq("id", PATRICIA_RESIDENT_ID);
  });

  it("student contract renders 'Estudante na ...'", async () => {
    const { signedUrl } = await generateContractDocx(IARA_CONTRACT_ID);
    const text = await extractDocxText(signedUrl);
    expect(text).toContain("Estudante na Instituto Superior Técnico");
    expect(text).not.toContain("trabalhador na");
    expect(text).not.toContain("Instituicao_Ensino");
    expect(text).not.toContain("Local_Trabalho");
  });

  it("professional contract renders 'trabalhador na ...'", async () => {
    await supabase
      .from("residents")
      .update({
        profile: "Profissional",
        employer_or_school: "Empresa Teste Lda.",
        address: "Rua Profissional 123, Lisboa",
        document_validity: "2030-12-31",
      })
      .eq("id", PATRICIA_RESIDENT_ID);

    const { signedUrl } = await generateContractDocx(PATRICIA_CONTRACT_ID);
    const text = await extractDocxText(signedUrl);
    expect(text).toContain("trabalhador na Empresa Teste Lda.");
    expect(text).not.toContain("Estudante na");
    expect(text).not.toContain("Instituicao_Ensino");
    expect(text).not.toContain("Local_Trabalho");
  });
});
