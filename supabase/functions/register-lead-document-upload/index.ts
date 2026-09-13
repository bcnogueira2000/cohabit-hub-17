import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    const fileName = String(body?.file_name ?? "").trim();
    const fileType = String(body?.file_type ?? "application/octet-stream").trim();
    const path = String(body?.storage_path ?? "").trim();
    if (!token || !fileName || !path) return json({ error: "Dados incompletos" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: leadId, error: tokenError } = await admin.rpc("lead_id_for_form_token", {
      p_token: token,
    });
    if (tokenError || !leadId) {
      return json({ error: tokenError?.message ?? "Este link expirou ou é inválido" }, 403);
    }

    const prefix = `${leadId}/`;
    if (!path.startsWith(prefix) || path.includes("..")) {
      return json({ error: "O caminho do documento não pertence a esta candidatura" }, 403);
    }

    const objectName = path.slice(prefix.length);
    const { data: objects, error: listError } = await admin.storage
      .from("lead-documents")
      .list(String(leadId), { search: objectName, limit: 2 });
    if (listError) return json({ error: listError.message }, 500);
    if (!objects?.some((object) => object.name === objectName)) {
      return json({ error: "O documento ainda não foi carregado" }, 400);
    }

    const { data: documentId, error: registerError } = await admin.rpc("register_lead_document", {
      p_token: token,
      p_file_name: fileName,
      p_storage_path: path,
      p_file_type: fileType,
    });
    if (registerError) return json({ error: registerError.message }, 500);

    return json({ ok: true, id: documentId, storage_path: path });
  } catch (error) {
    console.error("register-lead-document-upload error", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado" }, 500);
  }
});
