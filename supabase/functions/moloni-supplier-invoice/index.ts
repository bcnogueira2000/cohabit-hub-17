// Living Colours — cria no Moloni a fatura de fornecedor de uma cost_invoice, SEMPRE em rascunho (status 0).
// Body: { invoice_id: uuid, action: "discover" | "send", test?: boolean, force?: boolean }
// "discover" é só leitura (séries, IVA, artigos LC2, faturas de fornecedor existentes).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, logSync, moloniCall, requireManager } from "../_shared/moloni.ts";
import { loadCredentials } from "../_shared/moloni.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** "2600/000405" -> "LCCOM-405"; "FT 148" -> "LCCOM-148". Regra: último bloco numérico, sem zeros à esquerda. */
export function supplierReference(invoiceNumber: string | null): string | null {
  if (!invoiceNumber) return null;
  const m = invoiceNumber.match(/(\d+)\D*$/);
  if (!m) return null;
  return `LCCOM-${String(Number(m[1]))}`;
}

async function getAllPaged(sb: any, endpoint: string, body: Record<string, unknown>, max = 2000) {
  const out: any[] = [];
  for (let offset = 0; offset < max; offset += 50) {
    const page = await moloniCall<any[]>(sb, endpoint, { ...body, qty: 50, offset });
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    if (page.length < 50) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let userId = "";
  try {
    userId = await requireManager(req);
  } catch (err) {
    const msg = (err as Error).message;
    return json({ error: msg === "FORBIDDEN" ? "Só gestão pode enviar para o Moloni." : "Não autenticado" }, msg === "FORBIDDEN" ? 403 : 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const action = body?.action === "send" ? "send" : "discover";
  const invoiceId = String(body?.invoice_id ?? "");
  if (action === "send" && !/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: "invoice_id inválido" }, 400);

  const sb = adminClient();
  const creds = await loadCredentials(sb);
  const companyId = creds?.company_id;
  if (!companyId) return json({ error: "Moloni sem empresa ligada." }, 400);

  try {
    const sets = await moloniCall<any[]>(sb, "documentSets/getAll", { company_id: companyId });
    const forn = (sets ?? []).find((s) => String(s.name).toUpperCase() === "FORN");
    const taxes = await moloniCall<any[]>(sb, "taxes/getAll", { company_id: companyId });

    if (action === "discover") {
      const products = await getAllPaged(sb, "products/getAll", { company_id: companyId });
      const lc2 = products.filter((p) => String(p.reference ?? "").toUpperCase().startsWith("LC2"));
      const recent = await moloniCall<any[]>(sb, "supplierInvoices/getAll", { company_id: companyId, qty: 3, offset: 0 }).catch((e) => [String(e)]);
      return json({
        document_sets: (sets ?? []).map((s) => ({ id: s.document_set_id, name: s.name })),
        forn_set: forn ? { id: forn.document_set_id, name: forn.name } : null,
        taxes: (taxes ?? []).map((t) => ({ id: t.tax_id, name: t.name, value: t.value, type: t.type, saft: t.saft_type, fiscal_zone: t.fiscal_zone })),
        lc2_count: lc2.length,
        lc2_sample: lc2.slice(0, 3).map((p) => ({ id: p.product_id, ref: p.reference, name: p.name, taxes: p.taxes, exemption: p.exemption_reason })),
        recent_supplier_invoices: recent,
      });
    }

    if (!forn) throw new Error("Não encontrei a série FORN no Moloni.");

    const { data: inv } = await sb.from("cost_invoices").select("*").eq("id", invoiceId).maybeSingle();
    if (!inv) return json({ error: "Fatura não encontrada." }, 404);
    if (inv.status === "pending_classification") return json({ error: "Classifique a fatura antes de a enviar para o Moloni." }, 400);
    if (inv.moloni_document_id) return json({ error: `Esta fatura já foi enviada (${inv.moloni_document_number ?? inv.moloni_document_id}).` }, 409);
    const nif = String(inv.supplier_nif ?? "").replace(/\D/g, "");
    if (!nif) return json({ error: "A fatura não tem NIF do fornecedor." }, 400);
    const ref = supplierReference(inv.invoice_number);
    if (!ref) return json({ error: "Não consegui obter a referência a partir do número da fatura." }, 400);

    const { data: lines } = await sb.from("cost_invoice_lines").select("*").eq("invoice_id", invoiceId).order("sort");
    if (!lines?.length) return json({ error: "A fatura não tem linhas." }, 400);

    // Artigos LC2 por referência
    const products = await getAllPaged(sb, "products/getAll", { company_id: companyId });
    const byRef = new Map(products.map((p) => [String(p.reference ?? "").toUpperCase(), p]));

    // Fornecedor por NIF (cria se não existir)
    const found = await moloniCall<any[]>(sb, "suppliers/getByVat", { company_id: companyId, vat: nif });
    let supplierId = Number(found?.[0]?.supplier_id) || 0;
    let supplierCreated = false;

    // Duplicado: mesma referência do mesmo fornecedor
    if (supplierId) {
      const existing = await getAllPaged(sb, "supplierInvoices/getAll", { company_id: companyId, supplier_id: supplierId }, 500).catch(() => []);
      const dup = existing.find((d) => String(d.your_reference ?? "").trim().toUpperCase() === ref.toUpperCase()
        || String(d.our_reference ?? "").trim().toUpperCase() === ref.toUpperCase());
      if (dup) {
        const number = dup.document_set_name ? `${dup.document_set_name}/${dup.number}` : String(dup.number ?? dup.document_id);
        await logSync(sb, { entity: "cost_invoice", entity_id: invoiceId, action: "supplier_invoice_duplicate", success: false, message: number, payload: { document_id: dup.document_id } });
        return json({ error: `Já existe no Moloni uma fatura deste fornecedor com a referência ${ref} (${number}). Não foi criada outra.`, duplicate: { document_id: dup.document_id, number } }, 409);
      }
    } else {
      const supPayload = {
        company_id: companyId, vat: nif, number: nif, name: inv.supplier_name || `Fornecedor ${nif}`,
        language_id: 1, address: "Desconhecida", zip_code: "0000-000", city: "Desconhecida", country_id: 1,
        maturity_date_id: 0, payment_method_id: 0, delivery_method_id: 0, salesman_id: 0, payment_day: 0,
        discount: 0, credit_limit: 0, qty_copies_document: 1,
      };
      const created = await moloniCall<any>(sb, "suppliers/insert", supPayload);
      supplierId = Number(created?.supplier_id);
      if (!supplierId) throw new Error("O Moloni não devolveu o id do fornecedor criado.");
      supplierCreated = true;
    }

    const missingProducts: string[] = [];
    const missingTaxes: number[] = [];
    const molProducts = lines.map((l: any, i: number) => {
      const p = byRef.get(String(l.category_code ?? "").toUpperCase());
      if (!p) missingProducts.push(String(l.category_code));
      const rate = Number(l.vat_rate ?? 0);
      const item: Record<string, unknown> = {
        product_id: p?.product_id, name: p?.name ?? l.description ?? "Despesa",
        summary: l.description ?? "", qty: 1, price: Number(l.net ?? 0), discount: 0, order: i,
      };
      if (rate > 0) {
        const t = (taxes ?? []).find((t) => Number(t.value) === rate && Number(t.type) === 1 && String(t.fiscal_zone ?? "PT") === "PT")
          ?? (taxes ?? []).find((t) => Number(t.value) === rate);
        if (!t) missingTaxes.push(rate);
        item.taxes = [{ tax_id: t?.tax_id, value: rate, order: 0, cumulative: 0 }];
      } else {
        item.exemption_reason = "M99";
      }
      return item;
    });
    if (missingProducts.length) return json({ error: `Artigos não encontrados no Moloni: ${missingProducts.join(", ")}.` }, 400);
    if (missingTaxes.length) return json({ error: `Taxa de IVA não encontrada no Moloni: ${missingTaxes.join(", ")}%.` }, 400);

    const notes = body?.test ? "TESTE — rascunho criado pela app Living Colours, pode ser apagado." : "";
    const docPayload = {
      company_id: companyId, date: inv.invoice_date, expiration_date: inv.due_date ?? inv.invoice_date,
      document_set_id: forn.document_set_id, supplier_id: supplierId, your_reference: ref,
      status: 0, notes, products: molProducts,
    };
    const created = await moloniCall<any>(sb, "supplierInvoices/insert", docPayload);
    const documentId = Number(created?.document_id);
    if (!documentId) throw new Error(`O Moloni não devolveu o id do documento: ${JSON.stringify(created).slice(0, 300)}`);

    let number: string | null = null;
    let rawDoc: any = null;
    try {
      rawDoc = await moloniCall<any>(sb, "supplierInvoices/getOne", { company_id: companyId, document_id: documentId });
      number = rawDoc?.number ? `${rawDoc.document_set_name ?? "FORN"}/${rawDoc.number}` : null;
    } catch { /* informativo */ }

    const now = new Date().toISOString();
    await sb.from("cost_invoices").update({
      moloni_document_id: documentId, moloni_document_number: number ?? `Rascunho #${documentId}`,
      moloni_status: "draft", moloni_sent_at: now,
    }).eq("id", invoiceId);

    const { data: prof } = await sb.from("profiles").select("full_name").eq("user_id", userId).maybeSingle();
    await sb.from("cost_invoice_events").insert({
      invoice_id: invoiceId, user_id: userId, user_name: prof?.full_name ?? null, action: "moloni_sent",
      details: { document_id: documentId, number, reference: ref, supplier_created: supplierCreated, test: !!body?.test },
    });
    await logSync(sb, { entity: "cost_invoice", entity_id: invoiceId, action: "supplier_invoice_draft", success: true,
      payload: { document_id: documentId, number, status: rawDoc?.status, raw_number: rawDoc?.number } });

    return json({ ok: true, document_id: documentId, number, reference: ref, supplier_created: supplierCreated,
      draft_status: rawDoc?.status ?? null, draft_number_raw: rawDoc?.number ?? null });
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, { entity: "cost_invoice", entity_id: invoiceId || null, action: action === "send" ? "supplier_invoice_draft" : "discover", success: false, message });
    return json({ error: message }, 400);
  }
});
