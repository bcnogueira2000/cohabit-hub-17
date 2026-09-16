import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Chamada pelo trigger da base de dados (pg_net) quando um candidato submete
// o formulário de candidatura. Envia um email à equipa de reservas.
// Idempotente: só envia uma vez por lead (form_review_email_sent_at).

const FALLBACK_TEAM_EMAIL = "info@livingcolours.pt";
const FROM_EMAIL = "Living Colours <reservas@livingcolours.pt>";
const APP_URL = Deno.env.get("CANDIDATE_FORM_BASE_URL") ?? "https://cohabit-hub-17.lovable.app";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não está configurada" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const leadId = String(body?.lead_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead_id inválido" }, 400);

    // Marca como enviado de forma atómica — só a primeira chamada passa.
    const { data: lead, error } = await admin
      .from("leads")
      .update({ form_review_email_sent_at: new Date().toISOString() })
      .eq("id", leadId)
      .not("form_submitted_at", "is", null)
      .is("form_review_email_sent_at", null)
      .select("id, full_name, email, phone, nationality, profile, planned_check_in, planned_check_out, form_submitted_at")
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!lead) return json({ ok: true, skipped: true });

    const submitted = lead.form_submitted_at
      ? new Date(lead.form_submitted_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })
      : "";

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1f2937; line-height: 1.6;">
        <p><strong>${esc(lead.full_name)}</strong> submeteu o formulário de candidatura${submitted ? ` (${esc(submitted)})` : ""}.</p>
        <ul style="padding-left:18px;">
          <li>Email: ${esc(lead.email)}</li>
          ${lead.phone ? `<li>Telefone: ${esc(lead.phone)}</li>` : ""}
          ${lead.nationality ? `<li>Nacionalidade: ${esc(lead.nationality)}</li>` : ""}
          ${lead.planned_check_in ? `<li>Entrada prevista: ${esc(lead.planned_check_in)}</li>` : ""}
        </ul>
        <p><a href="${APP_URL}/leads" style="display:inline-block;padding:12px 20px;background:#1f6f6b;color:#ffffff;border-radius:9999px;text-decoration:none;">Rever candidatura</a></p>
        <p style="font-size:13px;color:#6b7280;">Os dados e documentos estão na ficha da lead, secção "Dados da candidatura".</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TEAM_EMAIL],
        subject: `Formulário preenchido: ${lead.full_name}`,
        html,
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`Resend failed [${res.status}]: ${details}`);
      // Permite nova tentativa
      await admin.from("leads").update({ form_review_email_sent_at: null }).eq("id", leadId);
      return json({ error: "Falha no envio do email", details }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("notificar-formulario-preenchido error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
