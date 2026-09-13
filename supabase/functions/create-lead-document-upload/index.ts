import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg"]);
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg"]);

const sanitize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-120);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    const fileName = String(body?.file_name ?? "").trim();
    const fileType = String(body?.file_type ?? "application/octet-stream").trim().toLowerCase();
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

    if (!token || !fileName) return json({ error: "Dados incompletos" }, 400);
    if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_TYPES.has(fileType)) {
      return json({ error: "Formato não permitido. Use PDF, JPG ou JPEG." }, 400);
    }

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

    const path = `${leadId}/${crypto.randomUUID()}-${sanitize(fileName)}`;
    const { data, error } = await admin.storage.from("lead-documents").createSignedUploadUrl(path);
    if (error || !data?.token) return json({ error: error?.message ?? "Não foi possível preparar o envio" }, 500);

    return json({
      path,
      signed_url: data.signedUrl,
      upload_token: data.token,
    });
  } catch (error) {
    console.error("create-lead-document-upload error", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado" }, 500);
  }
});
