import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

// Notificações push para o telemóvel da equipa.
// - Chamada pelo trigger da base de dados (pg_net) quando entra uma lead nova:
//   body { lead_id }. Idempotente: só envia uma vez por lead (new_lead_push_sent_at)
//   e só para leads criadas há menos de 1 hora.
// - Chamada pela app com sessão de equipa: body { action: "test" } envia uma
//   notificação de teste apenas para os dispositivos do próprio utilizador.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SOURCE_LABELS: Record<string, string> = {
  website_form: "Site",
  idealista: "Idealista",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  referral: "Recomendação",
  walk_in: "Presencial",
  email: "Email",
  phone: "Telefone",
  other: "Outro",
};

const STAFF_ROLES = ["staff", "manager", "admin"];

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
type Payload = { title: string; body: string; url: string; tag?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) return json({ error: "Chaves de notificação não configuradas" }, 500);
    webpush.setVapidDetails("mailto:info@livingcolours.pt", publicKey, privateKey);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));

    const sendTo = async (subs: Sub[], payload: Payload) => {
      let sent = 0;
      let removed = 0;
      const failures: string[] = [];
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(payload),
              { TTL: 60 * 60 * 24, urgency: "high" },
            );
            sent++;
            await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
          } catch (e: any) {
            const status = e?.statusCode;
            if (status === 404 || status === 410) {
              removed++;
              await admin.from("push_subscriptions").delete().eq("id", s.id);
            } else {
              failures.push(`[${status ?? "?"}] ${e?.body ?? e?.message ?? e}`);
              console.error("push failed", status, e?.body ?? e?.message);
            }
          }
        }),
      );
      return { sent, removed, failures };
    };

    // ---- Teste a partir da app (só os dispositivos do próprio utilizador) ----
    if (body?.action === "test") {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u, error: uErr } = await admin.auth.getUser(token);
      if (uErr || !u?.user) return json({ error: "Sessão inválida" }, 401);
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
      if (!(roles ?? []).some((r: any) => STAFF_ROLES.includes(r.role))) return json({ error: "Sem permissão" }, 403);
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", u.user.id);
      if (!subs?.length) return json({ error: "Este dispositivo ainda não tem as notificações ativas" }, 400);
      const r = await sendTo(subs as Sub[], {
        title: "Living Colours",
        body: "Notificações ativas neste dispositivo. Vais ser avisado quando entrar uma lead nova.",
        url: "/leads",
        tag: "teste",
      });
      return json({ ok: true, ...r });
    }

    // ---- Lead nova (trigger) ----
    const leadId = String(body?.lead_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead_id inválido" }, 400);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: lead, error: claimErr } = await admin
      .from("leads")
      .update({ new_lead_push_sent_at: new Date().toISOString() })
      .eq("id", leadId)
      .is("new_lead_push_sent_at", null)
      .gte("created_at", since)
      .select("id, full_name, source")
      .maybeSingle();
    if (claimErr) return json({ error: claimErr.message }, 500);
    if (!lead) return json({ ok: true, skipped: true });

    const { data: roleRows } = await admin.from("user_roles").select("user_id").in("role", STAFF_ROLES);
    const staffIds = [...new Set((roleRows ?? []).map((r: any) => r.user_id))];
    if (!staffIds.length) return json({ ok: true, sent: 0 });
    const { data: active } = await admin
      .from("profiles")
      .select("user_id")
      .in("user_id", staffIds)
      .eq("account_status", "active");
    const activeIds = (active ?? []).map((p: any) => p.user_id);
    if (!activeIds.length) return json({ ok: true, sent: 0 });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", activeIds);
    if (!subs?.length) return json({ ok: true, sent: 0 });

    const source = SOURCE_LABELS[String(lead.source ?? "")] ?? null;
    const r = await sendTo(subs as Sub[], {
      title: "Nova lead",
      body: source ? `${lead.full_name} · ${source}` : String(lead.full_name ?? ""),
      url: "/leads",
      tag: `lead-${lead.id}`,
    });
    return json({ ok: true, ...r });
  } catch (e: any) {
    console.error("push-nova-lead error", e);
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
