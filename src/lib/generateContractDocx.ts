import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";
import { amountToWords } from "@/lib/amountToWords";
import { compensacaoDenuncia, duracaoContrato } from "@/lib/contractDuration";

const TEMPLATE_BUCKET = "contract-templates";
const TEMPLATE_PATH = "PT_Template.docx";
const OUTPUT_BUCKET = "resident-documents";

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

const eur = (v: number): string =>
  new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " €";

/** Acrescenta o par Campo / Campo_Extenso a partir de um valor em euros. */
const setMoney = (data: Record<string, string>, key: string, value: number | null) => {
  if (value == null) {
    data[key] = "Não aplicável";
    data[`${key}_Extenso`] = "Não aplicável";
    return;
  }
  data[key] = eur(value);
  data[`${key}_Extenso`] = value > 0 ? amountToWords(value, "pt") : "";
};

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
    .select("room_id, rooms:room_id(number)")
    .eq("contract_id", contractId)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  const roomNumber = (stay as any)?.rooms?.number ?? "";

  // Renda atual = período com valid_from mais recente
  const periods = ((c.contract_rent_periods ?? []) as any[])
    .slice()
    .sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1));
  const currentRent = periods.length > 0 ? Number(periods[0].monthly_amount) : 0;
  const regularRent = c.regular_rent_amount == null ? null : Number(c.regular_rent_amount);

  const today = new Date();
  const isStudent = String(resident.profile ?? "").toLowerCase() === "student";

  const data: Record<string, string> = {
    Nome_Residente: resident.full_name ?? "",
    Nacionalidade: resident.nationality ?? "",
    Data_Nascimento: fmtDate(resident.date_of_birth),
    Morada: resident.address ?? "",
    Numero_Documento: resident.document_number ?? "",
    Validade_Documento: fmtDate(resident.document_validity),
    NIF: resident.tax_number || "___ ___ ___",
    Perfil: resident.profile ?? "",
    Instituicao_Ensino: isStudent ? resident.employer_or_school ?? "" : "N/A",
    Local_Trabalho: isStudent ? "N/A" : resident.employer_or_school ?? "",
    Numero_Quarto: String(roomNumber ?? ""),
    Data_Inicio: fmtDate(c.start_date),
    Data_Fim: fmtDate(c.end_date),
    Duracao_Contrato: duracaoContrato(c.start_date, c.end_date),
    Compensacao_Denuncia: compensacaoDenuncia(c.start_date, c.end_date),
    Contacto_Notificacao: resident.email ?? "",
    Codigo_Contrato: c.code ?? "",
    Dia_Assinatura: String(today.getDate()),
    Mes_Assinatura: MESES_PT[today.getMonth()],
    Ano_Assinatura: String(today.getFullYear()),
  };

  if (regularRent != null) {
    setMoney(data, "Valor_Remuneracao_Mensal", regularRent);
    setMoney(data, "Valor_Remuneracao_Periodo_Transitorio", currentRent);
    setMoney(data, "Valor_Reducao_Periodo_Transitorio", Math.max(0, regularRent - currentRent));
  } else {
    setMoney(data, "Valor_Remuneracao_Mensal", currentRent);
    setMoney(data, "Valor_Remuneracao_Periodo_Transitorio", null);
    setMoney(data, "Valor_Reducao_Periodo_Transitorio", null);
  }
  setMoney(data, "Valor_Caucao", Number(c.deposit_due ?? 0));

  // 2. Template do Storage
  const { data: file, error: dlErr } = await supabase.storage.from(TEMPLATE_BUCKET).download(TEMPLATE_PATH);
  if (dlErr || !file) {
    throw new Error("Modelo PT_Template.docx não encontrado em contract-templates");
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
  const fileName = `contrato-${c.code ?? c.id}.docx`;
  const path = `${resident.id}/${fileName}`;
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

  const { data: signed } = await supabase.storage.from(OUTPUT_BUCKET).createSignedUrl(path, 60 * 60);

  return { path, fileName, signedUrl: signed?.signedUrl ?? "" };
}
