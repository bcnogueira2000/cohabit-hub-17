import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";
import { amountToWords } from "@/lib/amountToWords";
import { compensacaoDenuncia, duracaoContrato } from "@/lib/contractDuration";
import { isPortuguese, nationalityToEN } from "@/lib/nationalityEN";
import { parseRoomNumber, shortName } from "@/lib/utils";
import {
  MESES_EN,
  MESES_PT,
  OUTPUT_BUCKET,
  TEMPLATE_BILINGUE,
  TEMPLATE_BUCKET,
  fmtDate,
  getTemplateForContract,
  setMoney,
  slugifyForPath,
  type GeneratedContractDoc,
} from "@/lib/generateContractDocx";

export type LeadContractTerms = {
  monthlyAmount: number;
  regularAmount?: number | null;
  paymentDay: number;
  depositDue: number;
  startDate: string;
  endDate: string;
  roomNumber?: string | null;
};

/**
 * Gera o documento de contrato a partir dos dados de uma lead reservada
 * (ainda sem contrato criado em Contratos). Reaproveita os utilitários de
 * generateContractDocx: duração, compensação, valores por extenso e modelo PT/bilingue.
 */
export async function generateContractDocxFromLead(
  leadId: string,
  terms: LeadContractTerms
): Promise<GeneratedContractDoc> {
  const { data: lead, error: lErr } = await supabase
    .from("leads" as any)
    .select("*")
    .eq("id", leadId)
    .single();
  if (lErr) throw lErr;
  const l: any = lead;

  // Quarto: prioridade ao indicado nos termos, senão o quarto reservado da lead
  let roomNumber = terms.roomNumber ?? "";
  if (!roomNumber && l.room_id) {
    const { data: room } = await supabase
      .from("rooms" as any)
      .select("number")
      .eq("id", l.room_id)
      .maybeSingle();
    roomNumber = (room as any)?.number ?? "";
  }

  const currentRent = Number(terms.monthlyAmount);
  const regularRent =
    terms.regularAmount == null || Number(terms.regularAmount) <= 0 ? null : Number(terms.regularAmount);

  const today = new Date();
  const profileRaw = String(l.profile ?? "");
  const isStudent = /student|estudante/i.test(profileRaw);
  const employerOrSchool = String(l.employer_or_school ?? "").trim();
  const parsedRoom = roomNumber ? parseRoomNumber(roomNumber) : null;

  const data: Record<string, string> = {
    Nome_Completo: l.full_name ?? "",
    Nacionalidade_PT: l.nationality ?? "",
    Data_Nascimento: fmtDate(l.date_of_birth),
    Morada_Residencia: [l.address, [l.postal_code, l.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    Codigo_Postal: l.postal_code ?? "",
    Localidade: l.city ?? "",
    "Nº_Doc_Identificacao": l.document_number ?? "",
    Validade_Doc_Identificacao: fmtDate(l.document_validity),
    NIF: l.tax_number || "___ ___ ___",
    Perfil: profileRaw,
    Perfil_Profissional: employerOrSchool
      ? isStudent
        ? `Estudante na ${employerOrSchool}`
        : `trabalhador na ${employerOrSchool}`
      : "",
    "Nº_Quarto": String(roomNumber ?? ""),
    Piso: parsedRoom?.floor != null ? String(parsedRoom.floor) : "",
    Lado: parsedRoom?.side ?? "",
    Data_Inicio: fmtDate(terms.startDate),
    Data_Termo: fmtDate(terms.endDate),
    Duracao_Contrato: duracaoContrato(terms.startDate, terms.endDate),
    Compensacao_Denuncia: compensacaoDenuncia(terms.startDate, terms.endDate),
    Contacto_Notificacao: l.email ?? "",
    Codigo_Contrato: "",
    Dia_Assinatura: String(today.getDate()),
    Mes_Assinatura_PT: MESES_PT[today.getMonth()],
    Ano_Assinatura: String(today.getFullYear()),
  };
  // Aliases legados
  data.Nome_Residente = data.Nome_Completo;
  data.Nacionalidade = data.Nacionalidade_PT;
  data.Morada = data.Morada_Residencia;
  data.Numero_Documento = data["Nº_Doc_Identificacao"];
  data.Validade_Documento = data.Validade_Doc_Identificacao;
  data.Numero_Quarto = data["Nº_Quarto"];
  data.Data_Fim = data.Data_Termo;
  data.Mes_Assinatura = data.Mes_Assinatura_PT;

  if (regularRent != null) {
    setMoney(data, "Valor_Remuneracao_Mensal", regularRent);
    setMoney(data, "Valor_Remuneracao_Periodo_Transitorio", currentRent);
    setMoney(data, "Valor_Reducao_Periodo_Transitorio", Math.max(0, regularRent - currentRent));
    data.Valor_Remuneracao_Transitorio_Extenso = data.Valor_Remuneracao_Periodo_Transitorio_Extenso;
    data.Valor_Reducao_Extenso = data.Valor_Reducao_Periodo_Transitorio_Extenso;
  } else {
    setMoney(data, "Valor_Remuneracao_Mensal", currentRent);
    setMoney(data, "Valor_Remuneracao_Periodo_Transitorio", null);
    setMoney(data, "Valor_Reducao_Periodo_Transitorio", null);
    data.Valor_Remuneracao_Transitorio_Extenso = "";
    data.Valor_Reducao_Extenso = "";
  }
  setMoney(data, "Valor_Caucao", Number(terms.depositDue ?? 0));

  const templatePath = getTemplateForContract({ nationality: l.nationality });
  if (templatePath === TEMPLATE_BILINGUE) {
    const wordsEN = (v: number | null) =>
      v != null && v > 0 ? amountToWords(v, "en") : v == null ? "Not applicable" : "";
    data.Nacionalidade_EN = nationalityToEN(l.nationality);
    data.Mes_Assinatura_EN = MESES_EN[today.getMonth()];
    data.Duracao_Contrato_EN = duracaoContrato(terms.startDate, terms.endDate, "en");
    data.Compensacao_Denuncia_EN = compensacaoDenuncia(terms.startDate, terms.endDate, "en");
    data.Perfil_Profissional_EN = employerOrSchool
      ? isStudent
        ? `Student at ${employerOrSchool}`
        : `working at ${employerOrSchool}`
      : "";
    data.Valor_Remuneracao_Mensal_Extenso_EN = wordsEN(regularRent != null ? regularRent : currentRent);
    data.Valor_Caucao_Extenso_EN = wordsEN(Number(terms.depositDue ?? 0));
    if (regularRent != null) {
      data.Valor_Remuneracao_Transitorio_Extenso_EN = wordsEN(currentRent);
      data.Valor_Reducao_Extenso_EN = wordsEN(Math.max(0, regularRent - currentRent));
      data.Valor_Remuneracao_Transitorio_Extenso_PT = data.Valor_Remuneracao_Transitorio_Extenso;
      data.Valor_Reducao_Extenso_PT = data.Valor_Reducao_Extenso;
    } else {
      data.Valor_Remuneracao_Transitorio_Extenso_EN = "";
      data.Valor_Reducao_Extenso_EN = "";
      data.Valor_Remuneracao_Transitorio_Extenso_PT = "";
      data.Valor_Reducao_Extenso_PT = "";
    }
    data.Perfil_Profissional_PT = data.Perfil_Profissional;
    data.Duracao_Contrato_PT = data.Duracao_Contrato;
    data.Compensacao_Denuncia_PT = data.Compensacao_Denuncia;
    data.Valor_Remuneracao_Mensal_Extenso_PT = data.Valor_Remuneracao_Mensal_Extenso;
    data.Valor_Caucao_Extenso_PT = data.Valor_Caucao_Extenso;
  }

  const { data: file, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(templatePath);
  if (dlErr || !file) {
    throw new Error(`Modelo ${templatePath} não encontrado em contract-templates`);
  }
  const buffer = await file.arrayBuffer();

  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "«", end: "»" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(data);
  const out: Blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const name = shortName(l.full_name) || "Residente";
  const roomPart = roomNumber ? `${roomNumber}_` : "";
  const fileName = `Contrato_${roomPart}${name}.docx`;
  const safeFileName = `${slugifyForPath(`Contrato_${roomPart}${name}`)}.docx`;
  const path = `leads/${leadId}/${safeFileName}`;
  const { error: upErr } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, out, {
    upsert: true,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  if (upErr) throw upErr;

  const { data: signed } = await supabase.storage
    .from(OUTPUT_BUCKET)
    .createSignedUrl(path, 60 * 60, { download: fileName });

  return { path, fileName, signedUrl: signed?.signedUrl ?? "" };
}
