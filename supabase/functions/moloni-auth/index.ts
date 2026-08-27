// Living Colours — gestão da ligação ao Moloni.
// Ações: status, connect (password grant), exchange_code, companies,
// select_company, test, disconnect. Restrito a manager/admin.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  adminClient,
  callbackUrl,
  CLIENT_ID,
  CLIENT_SECRET,
  loadCredentials,
  logSync,
  moloniCall,
  MOLONI_BASE,
  MOLONI_PASSWORD,
  MOLONI_USERNAME,
  requireManager,
  saveTokens,
  tokensByCode,
  tokensByPassword,
} from "../_shared/moloni.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Company {
  company_id: number;
  name: string;
  vat?: string;
}

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
  let payload: { action?: string; code?: string; company_id?: number } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const action = payload.action ?? "status";

  try {
    switch (action) {
      case "status": {
        const creds = await loadCredentials(sb);
        const authorizeUrl = CLIENT_ID
          ? `${MOLONI_BASE}/authorize/?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(callbackUrl())}`
          : null;
        return json({
          connected: Boolean(creds?.access_token),
          expires_at: creds?.expires_at ?? null,
          company_id: creds?.company_id ?? null,
          company_name: creds?.company_name ?? null,
          account_email: creds?.account_email ?? null,
          last_connected_at: creds?.last_connected_at ?? null,
          has_client_credentials: Boolean(CLIENT_ID && CLIENT_SECRET),
          has_password_credentials: Boolean(MOLONI_USERNAME && MOLONI_PASSWORD),
          callback_url: callbackUrl(),
          authorize_url: authorizeUrl,
        });
      }

      case "connect": {
        const tokens = await tokensByPassword();
        await saveTokens(sb, tokens, { account_email: MOLONI_USERNAME || null });
        await logSync(sb, { entity: "auth", action: "connect_password", success: true });
        return json({ ok: true });
      }

      case "exchange_code": {
        if (!payload.code) return json({ error: "code obrigatório" }, 400);
        const tokens = await tokensByCode(payload.code);
        await saveTokens(sb, tokens);
        await logSync(sb, { entity: "auth", action: "exchange_code", success: true });
        return json({ ok: true });
      }

      case "companies": {
        const companies = await moloniCall<Company[]>(sb, "companies/getAll");
        return json({ companies });
      }

      case "select_company": {
        if (!payload.company_id) return json({ error: "company_id obrigatório" }, 400);
        const companies = await moloniCall<Company[]>(sb, "companies/getAll");
        const match = companies.find((c) => Number(c.company_id) === Number(payload.company_id));
        if (!match) return json({ error: "Empresa não encontrada na conta Moloni" }, 400);
        const { error } = await sb
          .from("moloni_credentials")
          .update({ company_id: match.company_id, company_name: match.name })
          .eq("singleton", true);
        if (error) throw new Error(error.message);
        await logSync(sb, {
          entity: "auth",
          action: "select_company",
          success: true,
          payload: { company_id: match.company_id, name: match.name },
        });
        return json({ ok: true, company_id: match.company_id, company_name: match.name });
      }

      case "test": {
        const creds = await loadCredentials(sb);
        // companies/getOne não está autorizado nesta app Moloni — usar getAll.
        const companies = await moloniCall<any[]>(sb, "companies/getAll");
        const company = creds?.company_id
          ? companies.find((c) => Number(c.company_id) === Number(creds.company_id))
          : null;
        if (!company) {
          await logSync(sb, {
            entity: "auth",
            action: "test",
            success: true,
            message: `Ligação OK — ${companies.length} empresa(s), sem empresa selecionada`,
          });
          return json({ ok: true, company_selected: false, companies_found: companies.length });
        }
        await logSync(sb, {
          entity: "auth",
          action: "test",
          success: true,
          message: `Ligação OK — ${company.name} (NIF ${company.vat ?? "—"})`,
        });
        return json({
          ok: true,
          company_selected: true,
          company: { name: company.name, vat: company.vat, email: company.email },
        });
      }

      case "disconnect": {
        await sb
          .from("moloni_credentials")
          .update({ access_token: null, refresh_token: null, expires_at: null })
          .eq("singleton", true);
        await logSync(sb, { entity: "auth", action: "disconnect", success: true });
        return json({ ok: true });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, { entity: "auth", action, success: false, message });
    return json({ error: message }, 400);
  }
});
