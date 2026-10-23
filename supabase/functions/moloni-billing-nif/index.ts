// Living Colours — troca de NIF de faturação de um residente (nova ficha de cliente no Moloni).
// Body: { action: "preview" | "change" | "mark_suspended", resident_id, ... }
// A ficha antiga nunca é apagada nem alterada; fica arquivada no histórico.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, logSync, moloniCall, requireStaff } from "../_shared/moloni.ts";
import { loadSettings } from "../_shared/moloniSettings.ts";
import { isValidPtNif, nextCustomerNumber } from "../_shared/ptNif.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let user: { id: string; name: string | null };
  try {
    user = await requireStaff(req);
  } catch (err) {
    const m = (err as Error).message;
    return json({ error: m === "FORBIDDEN" ? "Sem permissões" : "Não autenticado" }, m === "FORBIDDEN" ? 403 : 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const action = String(body?.action ?? "");
  const residentId = String(body?.resident_id ?? "");
  if (!UUID.test(residentId)) return json({ error: "resident_id inválido" }, 400);

  const sb = adminClient();

  const { data: resident } = await sb
    .from("residents")
    .select("id, code, full_name, email, phone, tax_number, address, postal_code, city, moloni_customer_id, emergency_contact_name, emergency_contact_phone, emergency_contact_email")
    .eq("id", residentId).maybeSingle();
  if (!resident) return json({ error: "Residente não encontrado" }, 404);

  const { data: records = [] } = await sb
    .from("resident_moloni_customers").select("*").eq("resident_id", residentId).order("valid_from");
  const active = (records ?? []).find((r: any) => r.status === "active");

  if (action === "mark_suspended") {
    const recId = String(body?.record_id ?? "");
    const rec = (records ?? []).find((r: any) => r.id === recId && r.status === "archived");
    if (!rec) return json({ error: "Ficha arquivada não encontrada" }, 404);
    await sb.from("resident_moloni_customers").update({
      suspended_in_moloni_at: new Date().toISOString(), suspended_marked_by: user.id, suspended_marked_by_name: user.name,
    }).eq("id", recId);
    return json({ ok: true });
  }

  if (!resident.moloni_customer_id || !active) {
    return json({ error: "Este residente ainda não tem ficha no Moloni. Usa primeiro «Sincronizar com Moloni»." }, 400);
  }
  if (!resident.code) return json({ error: "Residente sem código." }, 400);

  // Cobranças dos contratos do residente
  const { data: contracts = [] } = await sb.from("contracts").select("id").eq("resident_id", residentId);
  const ids = (contracts ?? []).map((c: any) => c.id);
  const { data: charges = [] } = ids.length
    ? await sb.from("rent_charges")
        .select("id, year, month, amount, moloni_document_id, moloni_document_number, moloni_customer_record_id")
        .in("contract_id", ids).order("year").order("month")
    : { data: [] as any[] };

  if (action === "preview") {
    return json({
      active,
      records,
      proposed_number: nextCustomerNumber(resident.code, (records ?? []).map((r: any) => r.customer_number)),
      resident: { tax_number: resident.tax_number, address: resident.address, postal_code: resident.postal_code, city: resident.city, full_name: resident.full_name, code: resident.code },
      charges,
    });
  }

  if (action !== "change") return json({ error: "Ação inválida" }, 400);
  if (body?.confirm !== true) return json({ error: "Falta confirmação explícita." }, 400);

  const vat = String(body?.new_vat ?? "").replace(/\s/g, "");
  const address = String(body?.address ?? "").trim();
  const zip = String(body?.postal_code ?? "").trim();
  const city = String(body?.city ?? "").trim();
  const number = String(body?.customer_number ?? "").trim();
  const validFrom = String(body?.valid_from ?? "");
  if (!isValidPtNif(vat)) return json({ error: "NIF inválido (confere os 9 dígitos)." }, 400);
  if (vat === String(active.vat ?? resident.tax_number ?? "")) return json({ error: "O NIF novo é igual ao da ficha ativa." }, 400);
  if (!address) return json({ error: "Morada obrigatória." }, 400);
  if (!/^[A-Za-z0-9-]{1,30}$/.test(number)) return json({ error: "Número de ficha inválido." }, 400);
  if (!/^\d{4}-\d{2}$/.test(validFrom)) return json({ error: "Mês inválido." }, 400);
  const validFromDate = `${validFrom}-01`;
  if (validFromDate <= String(active.valid_from)) return json({ error: "O mês tem de ser posterior ao início da ficha atual." }, 400);
  if ((records ?? []).some((r: any) => r.customer_number === number)) return json({ error: `O número ${number} já foi usado neste residente.` }, 400);

  const { data: other } = await sb.from("residents").select("full_name").eq("tax_number", vat).neq("id", residentId).limit(1);
  if (other?.length) return json({ error: `Este NIF já pertence ao residente ${other[0].full_name}.` }, 400);

  try {
    const settings = await loadSettings(sb);

    const byNumber = await moloniCall<any[]>(sb, "customers/getByNumber", { company_id: settings.companyId, number }).catch(() => []);
    if (Array.isArray(byNumber) && byNumber.some((c) => String(c?.number) === number)) {
      throw new Error(`O número de cliente ${number} já existe no Moloni. Escolhe outro número.`);
    }
    const byVat = await moloniCall<any[]>(sb, "customers/getByVat", { company_id: settings.companyId, vat }).catch(() => []);
    if (Array.isArray(byVat) && byVat.length) {
      throw new Error(`Já existe no Moloni um cliente com o NIF ${vat} (nº ${byVat[0]?.number ?? byVat[0]?.customer_id}). Nada foi criado; verifica no Moloni.`);
    }

    const payload: Record<string, unknown> = {
      company_id: settings.companyId,
      vat, number,
      name: resident.full_name?.toUpperCase() ?? "",
      address, zip_code: zip, city,
      country_id: 1, language_id: 1,
      email: resident.email ?? "", phone: resident.phone ?? "",
      contact_name: resident.emergency_contact_name ?? "",
      contact_phone: resident.emergency_contact_phone ?? "",
      contact_email: resident.emergency_contact_email ?? "",
      maturity_date_id: settings.maturityDateId, payment_day: 5, discount: 0, credit_limit: 0,
      payment_method_id: settings.paymentMethodId, salesman_id: 0, delivery_method_id: 0,
    };
    const created = await moloniCall<any>(sb, "customers/insert", payload);
    const newId = Number(created?.customer_id);
    if (!newId) throw new Error("O Moloni não devolveu o id da ficha nova.");
    // O Moloni pode atribuir número automático no insert — forçar o escolhido.
    await moloniCall(sb, "customers/update", { ...payload, customer_id: newId });

    const now = new Date().toISOString();
    const { error: e1 } = await sb.from("resident_moloni_customers")
      .update({ status: "archived", archived_at: now }).eq("id", active.id);
    if (e1) throw new Error(`Ficha criada no Moloni (id ${newId}) mas falhou arquivar a antiga: ${e1.message}`);
    const { data: rec, error: e2 } = await sb.from("resident_moloni_customers").insert({
      resident_id: residentId, moloni_customer_id: newId, customer_number: number, vat,
      name: resident.full_name, address, zip_code: zip, city, status: "active",
      valid_from: validFromDate, active_from: now, created_by: user.id, created_by_name: user.name,
    }).select().single();
    if (e2) {
      await sb.from("resident_moloni_customers").update({ status: "active", archived_at: null }).eq("id", active.id);
      throw new Error(`Ficha criada no Moloni (id ${newId}) mas não ficou registada na app: ${e2.message}. O residente continua ligado à ficha antiga.`);
    }
    await sb.from("residents").update({
      moloni_customer_id: newId, tax_number: vat, address, postal_code: zip || null, city: city || null, moloni_synced_at: now,
    }).eq("id", residentId);

    await logSync(sb, {
      entity: "resident", entity_id: residentId, action: "change_billing_nif", success: true,
      payload: { old_customer_id: active.moloni_customer_id, old_vat: active.vat, new_customer_id: newId, new_vat: vat, number, valid_from: validFromDate, by: user.name },
    });
    // A API do Moloni (v1) não tem suspensão de cliente confirmada: fica lembrete para fazer à mão.
    return json({ ok: true, record: rec, archived_id: active.id, suspend_manually: true });
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, { entity: "resident", entity_id: residentId, action: "change_billing_nif", success: false, message });
    return json({ error: message }, 400);
  }
});
