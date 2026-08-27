// Living Colours — emite no Moloni o documento de uma renda (rent_charges).
// Body: { rent_charge_id: uuid, action?: "issue" | "pdf" }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, logSync, moloniCall, requireManager } from "../_shared/moloni.ts";
import { loadSettings } from "../_shared/moloniSettings.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await requireManager(req);
  } catch (err) {
    const msg = (err as Error).message;
    return json({ error: msg === "FORBIDDEN" ? "Sem permissões" : "Não autenticado" }, msg === "FORBIDDEN" ? 403 : 401);
  }

  const sb = adminClient();
  let chargeId = "";
  let action = "issue";
  try {
    const body = await req.json();
    chargeId = String(body?.rent_charge_id ?? "");
    action = body?.action === "pdf" ? "pdf" : "issue";
    if (!/^[0-9a-f-]{36}$/i.test(chargeId)) return json({ error: "rent_charge_id inválido" }, 400);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    const settings = await loadSettings(sb);

    const { data: charge, error } = await sb
      .from("rent_charges")
      .select(
        "id, contract_id, year, month, amount, due_date, moloni_document_id, moloni_document_number, contracts(id, code, resident_id, residents(id, full_name, moloni_customer_id, room_id, rooms(number)))",
      )
      .eq("id", chargeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!charge) return json({ error: "Renda não encontrada" }, 404);

    if (action === "pdf") {
      if (!charge.moloni_document_id) return json({ error: "Esta renda ainda não tem documento emitido." }, 400);
      const link = await moloniCall<any>(sb, "documents/getPDFLink", {
        company_id: settings.companyId,
        document_id: charge.moloni_document_id,
      });
      return json({ ok: true, url: link?.url ?? link?.pdf_link ?? null });
    }

    if (charge.moloni_document_id) {
      return json(
        { error: `Renda já emitida no Moloni (${charge.moloni_document_number ?? charge.moloni_document_id}).` },
        400,
      );
    }

    const contract: any = charge.contracts;
    const resident: any = contract?.residents;
    if (!resident) return json({ error: "Contrato sem residente associado." }, 400);
    if (!resident.moloni_customer_id) {
      return json({ error: "Residente ainda não sincronizado com o Moloni. Sincroniza o cliente primeiro." }, 400);
    }
    if (!settings.documentSetId) {
      return json({ error: "Nenhum conjunto de documentos configurado no Moloni." }, 400);
    }

    const roomNumber = resident.rooms?.number ? ` — Quarto ${resident.rooms.number}` : "";
    const description = `Renda ${MONTHS[(charge.month ?? 1) - 1]} ${charge.year}${roomNumber}`;

    const product: Record<string, unknown> = {
      name: settings.productName,
      summary: description,
      qty: 1,
      price: Number(charge.amount),
      discount: 0,
      order: 0,
    };
    if (settings.productId) product.product_id = settings.productId;
    if (settings.unitId) product.unit_id = settings.unitId;
    if (settings.taxId) {
      product.taxes = [{ tax_id: settings.taxId, value: 0, order: 0, cumulative: 0 }];
    } else {
      product.exemption_reason = settings.exemptionReason;
    }

    const today = new Date().toISOString().slice(0, 10);
    const created = await moloniCall<any>(sb, `${settings.documentType}/insert`, {
      company_id: settings.companyId,
      date: today,
      expiration_date: charge.due_date ?? today,
      document_set_id: settings.documentSetId,
      customer_id: resident.moloni_customer_id,
      our_reference: contract?.code ?? null,
      status: 1,
      products: [product],
    });

    const documentId = Number(created?.document_id);
    if (!documentId) throw new Error("O Moloni não devolveu o id do documento.");

    let documentNumber: string | null = null;
    try {
      const doc = await moloniCall<any>(sb, "documents/getOne", {
        company_id: settings.companyId,
        document_id: documentId,
      });
      documentNumber = doc?.document_set_name && doc?.number
        ? `${doc.document_set_name}/${doc.number}`
        : (doc?.number ?? null);
    } catch {
      // número é informativo; ignora falha
    }

    await sb
      .from("rent_charges")
      .update({
        moloni_document_id: documentId,
        moloni_document_number: documentNumber,
        moloni_status: "issued",
        moloni_issued_at: new Date().toISOString(),
      })
      .eq("id", chargeId);

    await logSync(sb, {
      entity: "rent_charge",
      entity_id: chargeId,
      action: "issue_document",
      success: true,
      payload: { document_id: documentId, number: documentNumber },
    });

    return json({ ok: true, document_id: documentId, document_number: documentNumber });
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, {
      entity: "rent_charge",
      entity_id: chargeId || null,
      action: action === "pdf" ? "get_pdf" : "issue_document",
      success: false,
      message,
    });
    return json({ error: message }, 400);
  }
});
