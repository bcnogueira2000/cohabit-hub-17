import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(160),
  email: z.string().trim().email("invalid email").max(255),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  language: z.string().trim().max(20).optional().nullable(),
  room_type_interest: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(80).optional().default("website"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const secret = Deno.env.get("WEBSITE_LEAD_SECRET");
  const provided = req.headers.get("x-webhook-secret");
  if (!secret || !provided || provided !== secret) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten().fieldErrors }, 400);
  }
  const b = parsed.data;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: b.name,
      email: b.email.toLowerCase(),
      phone: b.phone ?? null,
      what_brings_them: b.message ?? null,
      language: b.language ?? null,
      preferred_room_type: b.room_type_interest ?? null,
      source: "website_form",
      source_detail: b.source ?? "site",
      status: "new",
      gdpr_consent: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("lead insert failed", error.message);
    return json({ ok: false, error: "Could not create lead" }, 500);
  }

  const { error: actErr } = await supabase.from("lead_activity").insert({
    lead_id: data.id,
    kind: "created_from_website",
    payload: { source: b.source ?? "site", origin: "site" },
  });
  if (actErr) console.error("activity insert failed", actErr.message);

  return json({ ok: true, leadId: data.id });
});
