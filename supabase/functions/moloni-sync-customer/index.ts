// Living Colours — cria/atualiza um residente como cliente no Moloni.
// Body: { resident_id: uuid }

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
      name: resident.full_name,
      address: resident.address,
      country_id: COUNTRY_PT,
      language_id: 1,
      email: resident.email ?? "",
      phone: resident.phone ?? "",
    };

    let customerId = resident.moloni_customer_id as number | null;

    if (!customerId) {
      // Evita duplicados: procura por NIF
      const existing = await moloniCall<any[]>(sb, "customers/getByVat", {
        company_id: settings.companyId,
        vat: resident.tax_number,
      }).catch(() => []);
      if (Array.isArray(existing) && existing.length) {
        customerId = Number(existing[0].customer_id);
      }
    }

    if (customerId) {
      await moloniCall(sb, "customers/update", { ...payload, customer_id: customerId });
    } else {
      const nextNumber = await moloniCall<any>(sb, "customers/getNextNumber", {
        company_id: settings.companyId,
      }).catch(() => null);
      const created = await moloniCall<any>(sb, "customers/insert", {
        ...payload,
        number: nextNumber?.number ?? `LC-${residentId.slice(0, 8)}`,
      });
      customerId = Number(created?.customer_id);
      if (!customerId) throw new Error("O Moloni não devolveu o id do cliente.");
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
