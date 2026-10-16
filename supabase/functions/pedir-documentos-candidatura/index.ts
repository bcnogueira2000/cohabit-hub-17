import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { isPortugueseRecipient } from "../_shared/leadLanguage.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FORM_BASE_URL = (Deno.env.get("CANDIDATE_FORM_BASE_URL") ?? "").trim().replace(/\/+$/, "");
const FROM_EMAIL = "Living Colours <reservas@livingcolours.pt>";
const KINDS = ["id_document", "iban_proof", "enrollment_or_work_proof", "other"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

const profileGroup = (p: string) => {
  const s = p.trim().toLowerCase();
  if (["student", "estudante"].includes(s)) return "student";
  if (["professional", "profissional", "trabalhador", "worker"].includes(s)) return "worker";
  return "other";
};

const kindLabel = (k: string, profile: string, en: boolean) => {
  if (k === "id_document") return en ? "Identity document" : "Documento de identificação";
  if (k === "iban_proof") return en ? "Proof of IBAN" : "Comprovativo de IBAN";
  if (k === "enrollment_or_work_proof") {
    const g = profileGroup(profile);
    if (g === "student") return en ? "Proof of university enrollment" : "Comprovativo de matrícula na universidade";
    if (g === "worker") return en ? "Proof of employment" : "Comprovativo de vínculo laboral";
    return en ? "Proof of employment or activity" : "Comprovativo de vínculo laboral ou atividade";
  }
  return en ? "Other documents" : "Outros documentos";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    if (!FORM_BASE_URL) return json({ error: "CANDIDATE_FORM_BASE_URL não está configurada" }, 500);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não está configurada" }, 500);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    if (!(roles ?? []).some((r: any) => ["staff", "manager", "admin"].includes(r.role))) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = String(body?.lead_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead_id inválido" }, 400);
    const items: string[] = Array.isArray(body?.items) ? [...new Set(body.items.map((x: unknown) => String(x)))] as string[] : [];
    if (!items.length || items.some((k) => !KINDS.includes(k))) return json({ error: "Escolhe pelo menos um documento válido" }, 400);
    const message = String(body?.message ?? "").trim().slice(0, 2000);

    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, full_name, short_name, email, language, nationality, phone, profile, public_token, public_token_expires_at")
      .eq("id", leadId)
      .maybeSingle();
    if (leadErr) return json({ error: leadErr.message }, 500);
    if (!lead) return json({ error: "Candidatura não encontrada" }, 404);
    if (!lead.email) return json({ error: "Esta candidatura não tem email" }, 400);

    // Reutiliza o token se ainda for válido (não invalida o link anterior); senão gera um novo.
    const valid = lead.public_token && lead.public_token_expires_at && new Date(lead.public_token_expires_at) > new Date();
    const token = valid
      ? lead.public_token
      : Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
    const requestedAt = new Date().toISOString();

    const { error: upErr } = await admin
      .from("leads")
      .update({
        public_token: token,
        public_token_expires_at: expiresAt,
        docs_requested_at: requestedAt,
        docs_request_message: message || null,
        docs_request_items: items,
      })
      .eq("id", leadId);
    if (upErr) return json({ error: upErr.message }, 500);

    const isEN = !isPortugueseRecipient(lead);
    const firstName = esc((lead.short_name || lead.full_name || "").split(" ")[0] || "");
    const link = `${FORM_BASE_URL}/candidatura/${token}/documentos`;
    const list = items.map((k) => `<li>${esc(kindLabel(k, lead.profile ?? "", isEN))}</li>`).join("");
    const c = isEN
      ? { subject: "Documents needed — Living Colours", hi: firstName ? `Hi ${firstName},` : "Hi,", intro: "We need you to upload the following documents:", msg: "Message from the team:", cta: "Upload documents", fb: "If the button doesn't work, copy this address into your browser:", val: "This link is personal and valid for 14 days.", bye: "Thank you,<br />The Living Colours team" }
      : { subject: "Documentos em falta — Living Colours", hi: firstName ? `Olá ${firstName},` : "Olá,", intro: "Precisamos que carregues os seguintes documentos:", msg: "Mensagem da equipa:", cta: "Carregar documentos", fb: "Se o botão não funcionar, copia este endereço para o navegador:", val: "Este link é pessoal e é válido durante 14 dias.", bye: "Obrigado,<br />Equipa Living Colours" };

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1f2937; line-height: 1.6;">
        <p>${c.hi}</p>
        <p>${c.intro}</p>
        <ul style="padding-left:18px;">${list}</ul>
        ${message ? `<p><strong>${c.msg}</strong><br />${esc(message)}</p>` : ""}
        <p><a href="${esc(link)}" style="display:inline-block;padding:12px 20px;background:#1f6f6b;color:#ffffff;border-radius:9999px;text-decoration:none;">${c.cta}</a></p>
        <p style="font-size:13px;color:#6b7280;">${c.fb}<br />${esc(link)}</p>
        <p style="font-size:13px;color:#6b7280;">${c.val}</p>
        <p>${c.bye}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_EMAIL, to: [lead.email], subject: c.subject, html }),
    });
    if (!res.ok) {
      const details = await res.text();
      console.error(`Resend failed [${res.status}]: ${details}`);
      return json({ error: "Falha no envio do email", status: res.status, details }, res.status);
    }

    const { data: prof } = await admin.from("profiles").select("full_name").eq("user_id", callerId).maybeSingle();
    await admin.from("lead_activity").insert({
      lead_id: leadId,
      actor_user_id: callerId,
      actor_name: prof?.full_name ?? null,
      kind: "docs_requested",
      payload: { items, message: message || null, email: lead.email, token_reused: !!valid },
    });

    return json({ ok: true, email: lead.email, link });
  } catch (e) {
    console.error("pedir-documentos-candidatura error", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
