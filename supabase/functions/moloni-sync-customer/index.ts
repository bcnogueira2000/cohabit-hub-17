// Living Colours — cria/atualiza um residente como cliente no Moloni.
// Body: { resident_id: uuid, confirm?: boolean }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, logSync, moloniCall, requireManager } from "../_shared/moloni.ts";
import { loadSettings } from "../_shared/moloniSettings.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const COUNTRY_PT = 1;

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
  let residentId = "";
  try {
    const body = await req.json();
    residentId = String(body?.resident_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(residentId)) return json({ error: "resident_id inválido" }, 400);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    const settings = await loadSettings(sb);

    const { data: resident, error } = await sb
      .from("residents")
      .select("id, code, full_name, email, phone, tax_number, address, moloni_customer_id")
      .eq("id", residentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!resident) return json({ error: "Residente não encontrado" }, 404);

    const missing: string[] = [];
    if (!resident.full_name) missing.push("nome");
    if (!resident.tax_number) missing.push("NIF");
    if (!resident.address) missing.push("morada");
    if (!resident.code) missing.push("código do residente");
    if (missing.length) {
      return json({ error: `Faltam dados do residente: ${missing.join(", ")}` }, 400);
    }

    const payload: Record<string, unknown> = {
      company_id: settings.companyId,
      vat: resident.tax_number,
      name: resident.full_name?.toUpperCase() ?? "",
      address: resident.address,
      country_id: COUNTRY_PT,
      language_id: 1,
      email: resident.email ?? "",
      phone: resident.phone ?? "",
      maturity_date_id: settings.maturityDateId,
      payment_day: 5,
      discount: 0,
      credit_limit: 0,
      payment_method_id: settings.paymentMethodId,
    };
    // O Moloni rejeita null e também a omissão destes dois campos —
    // usa 0 como sentinela "sem vendedor / sem método de entrega".
    payload.salesman_id = 0;
    payload.delivery_method_id = 0;


    let customerId = resident.moloni_customer_id as number | null;

    if (!customerId) {
      // Nunca ligado por esta app: se já existir um cliente com este NIF no Moloni,
      // não mexe em nada — pára e avisa para confirmação manual.
      const existing = await moloniCall<any[]>(sb, "customers/getByVat", {
        company_id: settings.companyId,
        vat: resident.tax_number,
      }).catch(() => []);
      if (Array.isArray(existing) && existing.length) {
        const found = existing[0];
        const ref = found?.number || found?.customer_id;
        const message =
          `Já existe um cliente no Moloni com este NIF (nº ${ref}). Confirma antes de continuar.`;
        await logSync(sb, {
          entity: "resident",
          entity_id: residentId,
          action: "sync_customer",
          success: false,
          message,
          payload: { existing_customer_id: found?.customer_id, existing_number: found?.number },
        });
        return json({
          error: message,
          needs_confirmation: true,
          existing_customer_id: found?.customer_id ?? null,
          existing_customer_number: found?.number ?? null,
        }, 409);
      }
    }


    // O número do cliente no Moloni é sempre o código interno do residente (LC0001, …)
    payload.number = resident.code;

    if (customerId) {
      await moloniCall(sb, "customers/update", { ...payload, customer_id: customerId });
    } else {
      const created = await moloniCall<any>(sb, "customers/insert", payload);
      customerId = Number(created?.customer_id);
      if (!customerId) throw new Error("O Moloni não devolveu o id do cliente.");
      // O Moloni atribui um número automático no insert — forçar o código interno.
      await moloniCall(sb, "customers/update", { ...payload, customer_id: customerId });
    }


    await sb
      .from("residents")
      .update({ moloni_customer_id: customerId, moloni_synced_at: new Date().toISOString() })
      .eq("id", residentId);

    await logSync(sb, {
      entity: "resident",
      entity_id: residentId,
      action: "sync_customer",
      success: true,
      payload: { customer_id: customerId },
    });

    return json({ ok: true, customer_id: customerId });
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, {
      entity: "resident",
      entity_id: residentId || null,
      action: "sync_customer",
      success: false,
      message,
    });
    return json({ error: message }, 400);
  }
});
