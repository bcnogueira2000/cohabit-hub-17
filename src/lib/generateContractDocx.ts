import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";
import { amountToWords } from "@/lib/amountToWords";
import { compensacaoDenuncia, duracaoContrato } from "@/lib/contractDuration";
import { isPortuguese, nationalityToEN } from "@/lib/nationalityEN";
import { parseRoomNumber, shortName } from "@/lib/utils";

export const TEMPLATE_BUCKET = "contract-templates";
export const TEMPLATE_PT = "PT_Template.docx";
export const TEMPLATE_BILINGUE = "Bilingue_Template.docx";
export const OUTPUT_BUCKET = "resident-documents";

/** Escolhe o modelo Word conforme a nacionalidade do residente. */
export function getTemplateForContract(resident: { nationality?: string | null }): string {
  return isPortuguese(resident?.nationality) ? TEMPLATE_PT : TEMPLATE_BILINGUE;
}

export const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];


export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

export const eur = (v: number): string =>
  new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " €";

/** Acrescenta o par Campo / Campo_Extenso a partir de um valor em euros. */
export const setMoney = (data: Record<string, string>, key: string, value: number | null) => {
  if (value == null) {
    data[key] = "Não aplicável";
    data[`${key}_Extenso`] = "Não aplicável";
    return;
  }
  data[key] = eur(value);
  data[`${key}_Extenso`] = value > 0 ? amountToWords(value, "pt") : "";
};

/** Remove acentos e espaços para usar em caminhos de Storage. */
export const slugifyForPath = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

export type GeneratedContractDoc = {
  path: string;
  fileName: string;
  signedUrl: string;
};

export async function generateContractDocx(contractId: string): Promise<GeneratedContractDoc> {
  // 1. Contrato + residente + rendas
  const { data: contract, error: cErr } = await supabase
    .from("contracts" as any)
    .select(
      "id, code, resident_id, start_date, end_date, deposit_due, regular_rent_amount, residents:resident_id(*), contract_rent_periods(valid_from, monthly_amount)"
    )
    .eq("id", contractId)
    .single();
  if (cErr) throw cErr;

  const c: any = contract;
  const resident: any = c.residents ?? {};
  if (!resident?.id) throw new Error("Contrato sem residente associado");

  // Quarto via estadia ligada ao contrato
  const { data: stay } = await supabase
    .from("stays" as any)
    .select("room_id")
    .eq("contract_id", contractId)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  let roomNumber = "";
  const stayRoomId = (stay as any)?.room_id;
  if (stayRoomId) {
    const { data: room } = await supabase
      .from("rooms" as any)
      .select("number")
      .eq("id", stayRoomId)
      .maybeSingle();
    roomNumber = (room as any)?.number ?? "";
  }

  // Renda atual = período com valid_from mais recente
  const periods = ((c.contract_rent_periods ?? []) as any[])
    .slice()
    .sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1));
  const currentRent = periods.length > 0 ? Number(periods[0].monthly_amount) : 0;
  const regularRent = c.regular_rent_amount == null ? null : Number(c.regular_rent_amount);

  const today = new Date();
  const profileRaw = String(resident.profile ?? "");
  const isStudent = /student|estudante/i.test(profileRaw);
  const employerOrSchool = String(resident.employer_or_school ?? "").trim();
  const parsedRoom = roomNumber ? parseRoomNumber(roomNumber) : null;

  const data: Record<string, string> = {
    // Nomes usados pelo modelo Word (MERGEFIELD)
    Nome_Completo: resident.full_name ?? "",
    Nacionalidade_PT: resident.nationality ?? "",
    Data_Nascimento: fmtDate(resident.date_of_birth),
    Morada_Residencia: [resident.address, [(resident as any).postal_code, (resident as any).city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    Codigo_Postal: (resident as any).postal_code ?? "",
    Localidade: (resident as any).city ?? "",
    "Nº_Doc_Identificacao": resident.document_number ?? "",
    Validade_Doc_Identificacao: fmtDate(resident.document_validity),
    NIF: resident.tax_number || "___ ___ ___",
    Perfil: profileRaw,
    Perfil_Profissional: employerOrSchool
      ? (isStudent ? `Estudante na ${employerOrSchool}` : `trabalhador na ${employerOrSchool}`)
      : "",
    "Nº_Quarto": String(roomNumber ?? ""),
    Piso: parsedRoom?.floor != null ? String(parsedRoom.floor) : "",
    Lado: parsedRoom?.side ?? "",
    Data_Inicio: fmtDate(c.start_date),
    Data_Termo: fmtDate(c.end_date),
    Duracao_Contrato: duracaoContrato(c.start_date, c.end_date),
    Compensacao_Denuncia: compensacaoDenuncia(c.start_date, c.end_date),
    Contacto_Notificacao: resident.email ?? "",
    Codigo_Contrato: c.code ?? "",
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
    // Alias dos extensos para alinhar com os marcadores do template PT
    data.Valor_Remuneracao_Transitorio_Extenso = data.Valor_Remuneracao_Periodo_Transitorio_Extenso;
    data.Valor_Reducao_Extenso = data.Valor_Reducao_Periodo_Transitorio_Extenso;
  } else {
    setMoney(data, "Valor_Remuneracao_Mensal", currentRent);
    setMoney(data, "Valor_Remuneracao_Periodo_Transitorio", null);
    setMoney(data, "Valor_Reducao_Periodo_Transitorio", null);
    data.Valor_Remuneracao_Transitorio_Extenso = "";
    data.Valor_Reducao_Extenso = "";
  }
  setMoney(data, "Valor_Caucao", Number(c.deposit_due ?? 0));

  // 1b. Campos em inglês (apenas relevantes no modelo bilingue)
  const templatePath = getTemplateForContract(resident);
  if (templatePath === TEMPLATE_BILINGUE) {
    const wordsEN = (v: number | null) => (v != null && v > 0 ? amountToWords(v, "en") : v == null ? "Not applicable" : "");
    data.Nacionalidade_EN = nationalityToEN(resident.nationality);
    data.Mes_Assinatura_EN = MESES_EN[today.getMonth()];
    data.Duracao_Contrato_EN = duracaoContrato(c.start_date, c.end_date, "en");
    data.Compensacao_Denuncia_EN = compensacaoDenuncia(c.start_date, c.end_date, "en");
    data.Perfil_Profissional_EN = employerOrSchool
      ? (isStudent ? `Student at ${employerOrSchool}` : `working at ${employerOrSchool}`)
      : "";
    data.Valor_Remuneracao_Mensal_Extenso_EN = wordsEN(regularRent != null ? regularRent : currentRent);
    data.Valor_Caucao_Extenso_EN = wordsEN(Number(c.deposit_due ?? 0));
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

  // 2. Template do Storage
  const { data: file, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(templatePath);
  if (dlErr || !file) {
    throw new Error(`Modelo ${templatePath} não encontrado em contract-templates`);
  }
  const buffer = await file.arrayBuffer();


  // 3. Preencher marcadores «Nome_Campo»
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

  // 4. Guardar
  const residentName = shortName(resident.full_name) || "Residente";
  const roomPart = roomNumber ? `${roomNumber}_` : "";
  const fileName = `Contrato_${roomPart}${residentName}.docx`;
  const safeFileName = `${slugifyForPath(`Contrato_${roomPart}${residentName}`)}.docx`;
  const path = `${resident.id}/${safeFileName}`;
  const { error: upErr } = await supabase.storage.from(OUTPUT_BUCKET).upload(path, out, {
    upsert: true,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  if (upErr) throw upErr;

  // 5. signed_at
  await supabase
    .from("contracts" as any)
    .update({ signed_at: new Date().toISOString() } as any)
    .eq("id", contractId);

  const { data: signed } = await supabase.storage
    .from(OUTPUT_BUCKET)
    .createSignedUrl(path, 60 * 60, { download: fileName });

  return { path, fileName, signedUrl: signed?.signedUrl ?? "" };
}
