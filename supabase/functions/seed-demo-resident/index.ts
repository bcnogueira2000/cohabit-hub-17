import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "maria.demo@livingcolours.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Maria Demo";
const DEMO_PHONE = "+351 910 000 000";

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

    // Verify caller is staff
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

    // Check caller is staff
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

    // 1) Find or create the demo auth user
    let userId: string | null = null;

    // listUsers paginated; search by email
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL,
    );

    if (existing) {
      userId = existing.id;
      // Reset password + ensure confirmed
      await admin.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME, phone: DEMO_PHONE },
      });
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: DEMO_NAME, phone: DEMO_PHONE },
        });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // 2) Pick a room (first available, else any)
    const { data: availableRoom } = await admin
      .from("rooms")
      .select("id")
      .eq("status", "available")
      .limit(1)
      .maybeSingle();
    let roomId: string | null = availableRoom?.id ?? null;
    if (!roomId) {
      const { data: anyRoom } = await admin
        .from("rooms")
        .select("id")
        .limit(1)
        .maybeSingle();
      roomId = anyRoom?.id ?? null;
    }

    const moveIn = new Date();
    moveIn.setDate(moveIn.getDate() - 30);
    const moveOut = new Date();
    moveOut.setMonth(moveOut.getMonth() + 6);

    // 3) Upsert resident by email
    const { data: existingResident } = await admin
      .from("residents")
      .select("id")
      .eq("email", DEMO_EMAIL)
      .maybeSingle();

    let residentId: string;
    if (existingResident) {
      residentId = existingResident.id;
      await admin
        .from("residents")
        .update({
          full_name: DEMO_NAME,
          phone: DEMO_PHONE,
          user_id: userId,
          room_id: roomId,
          move_in: moveIn.toISOString(),
          move_out: moveOut.toISOString(),
          status: "active",
        })
        .eq("id", residentId);
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("residents")
        .insert({
          full_name: DEMO_NAME,
          email: DEMO_EMAIL,
          phone: DEMO_PHONE,
          user_id: userId,
          room_id: roomId,
          move_in: moveIn.toISOString(),
          move_out: moveOut.toISOString(),
          status: "active",
          avatar_color: "#F59E0B",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      residentId = inserted.id;
    }

    // 4) Upsert profile
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
          phone: DEMO_PHONE,
          account_status: "active",
          resident_id: residentId,
        })
        .eq("user_id", userId);
    } else {
      await admin.from("profiles").insert({
        user_id: userId,
        full_name: DEMO_NAME,
        email: DEMO_EMAIL,
        phone: DEMO_PHONE,
        account_status: "active",
        resident_id: residentId,
      });
    }

    // 5) Ensure resident role
    await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "resident" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

    return new Response(
      JSON.stringify({
        ok: true,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        user_id: userId,
        resident_id: residentId,
        room_id: roomId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("seed-demo-resident error", e);
    return new Response(
      JSON.stringify({ error: e.message ?? String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
