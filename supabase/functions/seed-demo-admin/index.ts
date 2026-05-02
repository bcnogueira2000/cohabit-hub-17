import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "sandra.teste@livingcolours.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Sandra Teste";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Caller must be staff/manager/admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub);
    const isStaff = (roles ?? []).some((r: any) =>
      ["staff", "manager", "admin"].includes(r.role),
    );
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create the demo auth user
    let userId: string | null = null;
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1, perPage: 200,
    });
    if (listErr) throw listErr;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL,
    );

    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME },
      });
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: DEMO_NAME },
        });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Upsert profile (active, no resident_id)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      await admin
        .from("profiles")
        .update({
          full_name: DEMO_NAME,
          email: DEMO_EMAIL,
          account_status: "active",
        })
        .eq("user_id", userId);
    } else {
      await admin.from("profiles").insert({
        user_id: userId,
        full_name: DEMO_NAME,
        email: DEMO_EMAIL,
        account_status: "active",
      });
    }

    // Ensure admin role
    await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    return new Response(
      JSON.stringify({
        ok: true,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        user_id: userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("seed-demo-admin error", e);
    return new Response(
      JSON.stringify({ error: e.message ?? String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
