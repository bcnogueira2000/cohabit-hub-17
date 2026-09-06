import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_BYTES = 15 * 1024 * 1024;

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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    const fileName = String(body?.file_name ?? "").trim();
    const fileType = String(body?.file_type ?? "application/octet-stream").trim();
    const base64 = String(body?.file_content_base64 ?? "");

    if (!token || !fileName || !base64) {
      return json({ error: "Dados incompletos" }, 400);
    }

    // Valida o token e obtém a lead (erro claro se expirou)
    const { data: leadId, error: tokenErr } = await admin.rpc(
      "lead_id_for_form_token",
      { p_token: token }
    );
    if (tokenErr || !leadId) {
      return json({ error: tokenErr?.message ?? "Este link expirou ou é inválido" }, 403);
    }

    const clean = base64.includes(",") ? base64.split(",").pop()! : base64;
    let bytes: Uint8Array;
    try {
      const bin = atob(clean);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return json({ error: "Ficheiro inválido" }, 400);
    }
    if (bytes.byteLength > MAX_BYTES) {
      return json({ error: "Ficheiro demasiado grande (máx. 15 MB)" }, 400);
    }

    const path = `${leadId}/${Date.now()}-${sanitize(fileName)}`;
    const { error: upErr } = await admin.storage
      .from("lead-documents")
      .upload(path, bytes, { contentType: fileType, upsert: false });
    if (upErr) return json({ error: upErr.message }, 500);

    const { data: docId, error: regErr } = await admin.rpc("register_lead_document", {
      p_token: token,
      p_file_name: fileName,
      p_storage_path: path,
      p_file_type: fileType,
    });
    if (regErr) {
      await admin.storage.from("lead-documents").remove([path]);
      return json({ error: regErr.message }, 500);
    }

    return json({ ok: true, id: docId, storage_path: path });
  } catch (e) {
    console.error("upload-lead-document error", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado" }, 500);
  }
});
