// Living Colours — recebe o Database Webhook do Supabase do SITE
// (INSERT em interest_submissions) e cria a lead correspondente no
// Supabase da APP (tabela leads).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("LEAD_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface WebhookPayload {
  type: string;
  table: string;
  record: Record<string, unknown>;
}

const HEARD_ABOUT_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  referral: "Recomendação",
  friend: "Amigo",
  university: "Universidade",
  company: "Empresa",
  google: "Pesquisa Google",
  other: "Outro",
};

function buildSourceDetail(record: Record<string, unknown>): string | null {
  const heard = record.heard_about_us as string | null;
  if (!heard) return null;
  if (heard === "other" && record.heard_about_us_other) {
    return String(record.heard_about_us_other);
  }
  return HEARD_ABOUT_LABELS[heard] ?? heard;
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "interest_submissions") {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const r = payload.record;

  const leadPayload = {
    full_name: r.full_name,
    email: r.email,
    phone: r.phone ?? null,
    nationality: r.nationality ?? null,
    gender: r.gender ?? null,
    age: r.age ?? null,
    profile: r.profile ?? null,
    profile_other: r.profile_other ?? null,
    source: "website_form",
    source_detail: buildSourceDetail(r),
    preferred_room_type: r.preferred_room_type ?? null,
    preferred_move_in: r.move_in_timing ?? null,
    stay_duration: r.stay_duration ?? null,
    what_brings_them: r.what_brings_you ?? null,
    gdpr_consent: r.gdpr_consent ?? false,
    language: r.language ?? null,
    external_ref: r.id ? String(r.id) : null,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(leadPayload)
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar lead a partir do site:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, leadId: data.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
