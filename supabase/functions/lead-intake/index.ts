import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LEAD_SOURCES = [
  "website_form", "idealista", "instagram", "linkedin",
  "referral", "walk_in", "email", "phone", "other",
] as const;

const s = (max: number) => z.string().trim().max(max).optional().nullable();

const BodySchema = z.object({
  fullName: z.string().trim().min(1, "Nome obrigatório").max(160),
  email: z.string().trim().email("Email inválido").max(255),
  phone: s(40),
  nationality: s(80),
  gender: s(40),
  age: s(20),
  profile: s(80),
  profileOther: s(120),
  preferredRoomType: s(80),
  preferredMoveIn: s(60),
  stayDuration: s(80),
  whatBringsThem: s(1000),
  budgetRange: s(80),
  language: s(20),
  message: s(2000),
  gdprConsent: z.boolean().refine((v) => v === true, "Consentimento RGPD obrigatório"),
  source: z.enum(LEAD_SOURCES).optional(),
  sourceDetail: s(160),
  externalRef: s(160),
  honeypot: z.string().max(0).optional().nullable(),
}).passthrough();

// naive in-memory rate limit (per isolate): 10 req/min/IP
const hits = new Map<string, number[]>();
const rateLimited = (ip: string) => {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 10;
};

const KNOWN = new Set([
  ...Object.keys(BodySchema._def.shape()),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("LEAD_INTAKE_API_KEY");
  const provided = req.headers.get("x-api-key");
  if (!apiKey || provided !== apiKey) return json({ error: "Unauthorized" }, 401);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ error: "Too many requests" }, 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const b = parsed.data;

  // keep any unexpected fields so no submitted info is lost
  const extras = Object.entries(b as Record<string, unknown>)
    .filter(([k, v]) => !KNOWN.has(k) && v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);

  const notesParts = [b.message?.trim(), ...extras].filter(Boolean) as string[];
  const notes = notesParts.length ? notesParts.join("\n") : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const email = b.email.toLowerCase();
  const ACTIVE = ["new", "contacted", "visit_scheduled", "visited", "proposal_sent", "negotiating"];

  const { data: existing, error: findErr } = await supabase
    .from("leads")
    .select("id, notes")
    .eq("email", email)
    .in("status", ACTIVE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) {
    console.error("lookup failed", findErr.message);
    return json({ error: "Lookup failed" }, 500);
  }

  if (existing) {
    const { error: actErr } = await supabase.from("lead_activity").insert({
      lead_id: existing.id,
      kind: "duplicate_submission",
      payload: {
        source: b.source ?? "website_form",
        source_detail: b.sourceDetail ?? null,
        submitted: { ...b, honeypot: undefined },
      },
    });
    if (actErr) console.error("activity insert failed", actErr.message);
    return json({ ok: true, leadId: existing.id, duplicate: true });
  }

  const { data: created, error: insErr } = await supabase
    .from("leads")
    .insert({
      full_name: b.fullName,
      email,
      phone: b.phone ?? null,
      nationality: b.nationality ?? null,
      gender: b.gender ?? null,
      age: b.age ?? null,
      profile: b.profile ?? null,
      profile_other: b.profileOther ?? null,
      source: b.source ?? "website_form",
      source_detail: b.sourceDetail ?? null,
      preferred_room_type: b.preferredRoomType ?? null,
      preferred_move_in: b.preferredMoveIn ?? null,
      stay_duration: b.stayDuration ?? null,
      what_brings_them: b.whatBringsThem ?? null,
      budget_range: b.budgetRange ?? null,
      language: b.language ?? null,
      external_ref: b.externalRef ?? null,
      gdpr_consent: true,
      status: "new",
      notes,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("insert failed", insErr.message);
    return json({ error: "Could not create lead" }, 500);
  }

  const { error: actErr } = await supabase.from("lead_activity").insert({
    lead_id: created.id,
    kind: "created_from_website",
    payload: { source_detail: b.sourceDetail ?? null },
  });
  if (actErr) console.error("activity insert failed", actErr.message);

  return json({ ok: true, leadId: created.id });
});
