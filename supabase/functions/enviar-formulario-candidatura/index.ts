import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FORM_BASE_URL =
  Deno.env.get("CANDIDATE_FORM_BASE_URL") ?? "https://SEU_DOMINIO";
const FROM_EMAIL = "Living Colours <reservas@livingcolours.pt>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return json({ error: "RESEND_API_KEY não está configurada" }, 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(jwt);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const allowed = (callerRoles ?? []).some((r: any) =>
      ["staff", "manager", "admin"].includes(r.role)
    );
    if (!allowed) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = String(body?.lead_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
      return json({ error: "lead_id inválido" }, 400);
    }

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, full_name, short_name, email")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr) return json({ error: leadErr.message }, 500);
    if (!lead) return json({ error: "Candidatura não encontrada" }, 404);
    if (!lead.email) return json({ error: "Esta candidatura não tem email" }, 400);

    const { data: tokenRows, error: tokenErr } = await admin.rpc(
      "generate_lead_form_token",
      { p_lead_id: leadId }
    );
    if (tokenErr) return json({ error: tokenErr.message }, 500);
    const row = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;
    const token = row?.token as string | undefined;
    if (!token) return json({ error: "Não foi possível gerar o link" }, 500);

    const link = `${FORM_BASE_URL}/candidatura/${token}`;
    const greeting = (lead.short_name || lead.full_name || "").split(" ")[0] || "Olá";

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1f2937; line-height: 1.6;">
        <p>Olá ${greeting},</p>
        <p>Para avançarmos com a tua candidatura, pedimos que preenchas o formulário abaixo com os teus dados.</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#1f6f6b;color:#ffffff;border-radius:9999px;text-decoration:none;">Preencher formulário</a></p>
        <p style="font-size:13px;color:#6b7280;">Se o botão não funcionar, copia este endereço para o navegador:<br />${link}</p>
        <p style="font-size:13px;color:#6b7280;">Este link é pessoal e é válido durante 14 dias.</p>
        <p>Obrigado,<br />Equipa Living Colours</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [lead.email],
        subject: "Formulário de candidatura — Living Colours",
        html,
      }),
    });

    if (!resendRes.ok) {
      const details = await resendRes.text();
      console.error(`Resend failed [${resendRes.status}]: ${details}`);
      return json(
        { error: "Falha no envio do email", status: resendRes.status, details },
        resendRes.status
      );
    }

    const sent = await resendRes.json();

    await admin.from("lead_activity").insert({
      lead_id: leadId,
      actor_user_id: callerId,
      kind: "form_sent",
      payload: { email: lead.email, expires_at: row?.expires_at ?? null },
    });

    return json({ ok: true, email: lead.email, link, message_id: sent?.id ?? null });
  } catch (e) {
    console.error("enviar-formulario-candidatura error", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
