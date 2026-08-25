import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { supabase } from "@/integrations/supabase/client";
import { amountToWords } from "@/lib/amountToWords";
import { isPortuguese, nationalityToEN } from "@/lib/nationalityEN";
import { parseRoomNumber } from "@/lib/utils";

const TEMPLATE_BUCKET = "contract-templates";
const TEMPLATE_PT = "Reservation_PT.docx";
const TEMPLATE_BILINGUE = "Reservation_Bilingue.docx";
const OUTPUT_BUCKET = "resident-documents";

/** Escolhe o modelo do acordo de reserva conforme a nacionalidade. */
export function getTemplateForReservation(person: { nationality?: string | null }): string {
  return isPortuguese(person?.nationality) ? TEMPLATE_PT : TEMPLATE_BILINGUE;
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

/** "15 de setembro de 2026" (pt) / "September 15, 2026" (en) */
const fmtDateLong = (d: string | null | undefined, lang: "pt" | "en" = "pt"): string => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return lang === "pt"
    ? `${dt.getDate()} de ${MESES_PT[dt.getMonth()]} de ${dt.getFullYear()}`
    : `${MESES_EN[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
};

const num2 = (v: number): string =>
  new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const slugifyForPath = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

export type GeneratedReservationDoc = {
  path: string;
  fileName: string;
  signedUrl: string;
};

export async function generateReservationDocx(leadId: string): Promise<GeneratedReservationDoc> {
  // 1. Lead
  const { data: lead, error: lErr } = await supabase
    .from("leads" as any)
    .select("*")
    .eq("id", leadId)
    .single();
  if (lErr) throw lErr;
  const l: any = lead;

  if (l.reservation_deadline == null || l.reservation_fee_amount == null) {
    throw new Error("Define o prazo limite e o valor da taxa de reserva antes de gerar o acordo.");
  }

  // 2. Residente associado (via contrato) se já existir
  let resident: any = null;
  if (l.contract_id) {
    const { data: contract } = await supabase
      .from("contracts" as any)
      .select("resident_id, residents:resident_id(*)")
      .eq("id", l.contract_id)
      .maybeSingle();
    resident = (contract as any)?.residents ?? null;
  }

  // 3. Quarto: estadia ligada, senão preferência da lead
  let roomNumber = "";
  if (l.stay_id) {
    const { data: stay } = await supabase
      .from("stays" as any)
      .select("room_id")
      .eq("id", l.stay_id)
      .maybeSingle();
    const roomId = (stay as any)?.room_id;
    if (roomId) {
      const { data: room } = await supabase
        .from("rooms" as any)
        .select("number")
        .eq("id", roomId)
        .maybeSingle();
      roomNumber = (room as any)?.number ?? "";
    }
  }
  if (!roomNumber) roomNumber = l.preferred_room_type ?? "";

  const fullName = l.full_name || resident?.full_name || "";
  const nationality = l.nationality || resident?.nationality || "";
  const email = l.email || resident?.email || "";
  const fee = Number(l.reservation_fee_amount);
  const parsedRoom = roomNumber ? parseRoomNumber(roomNumber) : null;
  const today = new Date();

  const data: Record<string, string> = {
    Nome_Completo: fullName,
    Nacionalidade_PT: nationality,
    Data_Nascimento: fmtDate(resident?.date_of_birth),
    Morada_Residencia: l.address || resident?.address || "",
    "Nº_Doc_Identificacao": l.document_number || resident?.document_number || "",
    Validade_Doc_Identificacao: fmtDate(l.document_validity || resident?.document_validity),
    NIF: l.tax_number || resident?.tax_number || "___ ___ ___",
    "Nº_Quarto": String(roomNumber ?? ""),
    Piso: parsedRoom?.floor != null ? String(parsedRoom.floor) : "",
    Lado: parsedRoom?.side ?? "",
    // O modelo já escreve "EUR" antes do marcador
    Valor_Taxa_Reserva: num2(fee),
    Valor_Taxa_Reserva_Extenso: fee > 0 ? amountToWords(fee, "pt") : "",
    Data_Limite_Reserva: fmtDateLong(l.reservation_deadline, "pt"),
    Data_Limite_Reserva_Curta: fmtDate(l.reservation_deadline),
    Contacto_Notificacao: email,
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
  data.Mes_Assinatura = data.Mes_Assinatura_PT;
  data.Valor_Taxa_Reserva_Extenso_PT = data.Valor_Taxa_Reserva_Extenso;

  const templatePath = getTemplateForReservation({ nationality });
  if (templatePath === TEMPLATE_BILINGUE) {
    data.Nacionalidade_EN = nationalityToEN(nationality);
    data.Mes_Assinatura_EN = MESES_EN[today.getMonth()];
    data.Valor_Taxa_Reserva_Extenso_EN = fee > 0 ? amountToWords(fee, "en") : "";
    data.Data_Limite_Reserva_EN = fmtDateLong(l.reservation_deadline, "en");
  }

  // 4. Template
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

  // 5. Guardar
  const displayName = (fullName || "Residente").trim();
  const fileName = `Acordo_Reserva_${displayName}.docx`;
  const path = `leads/${leadId}/reserva-${slugifyForPath(displayName)}.docx`;
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
