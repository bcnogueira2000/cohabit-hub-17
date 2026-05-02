import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ROLES = ["resident", "staff", "manager", "admin"] as const;
type Role = (typeof ROLES)[number];

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
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Caller must be admin
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (callerRoles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { user_id, role, action } = body as {
      user_id: string;
      role: Role;
      action: "add" | "remove";
    };

    if (!user_id || !ROLES.includes(role) || !["add", "remove"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove" && role === "admin") {
      // Don't let the last admin be removed
      const { data: admins } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if ((admins ?? []).length <= 1) {
        return new Response(
          JSON.stringify({ error: "Não é possível remover o último admin." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (action === "add") {
      const { error } = await admin
        .from("user_roles")
        .upsert(
          { user_id, role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw error;
    } else {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("set-user-role error", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
