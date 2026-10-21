import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PATH_RE = /^[0-9]{4}\/(0[1-9]|1[0-2])\/[0-9a-f-]{36}-[A-Za-z0-9][A-Za-z0-9._-]*\.(pdf|jpg|jpeg|png)$/;

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Sessão inválida" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sessão inválida" }, 401);
    const { data: staff } = await userClient.rpc("is_staff", { _user_id: u.user.id });
    if (!staff) return json({ error: "Sem permissão" }, 403);

    const body = await req.json().catch(() => ({}));
    const path = String(body?.path ?? "");
    const categories = Array.isArray(body?.categories) ? body.categories.slice(0, 80).map(String) : [];
    if (!PATH_RE.test(path)) return json({ error: "Ficheiro inválido" }, 400);

    const { data: file, error: dlErr } = await userClient.storage.from("cost-invoices").download(path);
    if (dlErr || !file) return json({ error: "Não foi possível ler o ficheiro" }, 400);
    const mime = path.endsWith(".pdf") ? "application/pdf" : path.endsWith(".png") ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${toBase64(await file.arrayBuffer())}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Leitura automática indisponível" }, 500);

    const props: Record<string, unknown> = {
      supplier_name: { type: ["string", "null"] },
      supplier_nif: { type: ["string", "null"] },
      buyer_nif: { type: ["string", "null"] },
      invoice_number: { type: ["string", "null"] },
      atcud: { type: ["string", "null"] },
      invoice_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      due_date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      total_net: { type: ["number", "null"] },
      total_vat: { type: ["number", "null"] },
      total_gross: { type: ["number", "null"] },
      vat_rate: { type: ["number", "null"], description: "Taxa principal de IVA, ex. 23" },
      category_code: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["low", "high"] },
    };
    const userContent: unknown[] = [
      { type: "input_text", text: `Categorias possíveis (código: nome):\n${categories.join("\n")}` },
      mime === "application/pdf"
        ? { type: "input_file", filename: "fatura.pdf", file_data: dataUrl }
        : { type: "input_image", image_url: dataUrl },
    ];
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Extrais dados de faturas portuguesas de fornecedores. Usa o QR code fiscal se legível. Datas em YYYY-MM-DD, valores em euros com ponto decimal. Não inventes: usa null no que não vês. Para category_code escolhe o código mais provável da lista dada.",
        input: [{ role: "user", content: userContent }],
        text: {
          format: {
            type: "json_schema",
            name: "invoice",
            strict: true,
            schema: { type: "object", properties: props, required: Object.keys(props), additionalProperties: false },
          },
        },
      }),
    });
    if (res.status === 429) return json({ error: "Muitos pedidos, tenta daqui a pouco" }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA esgotados" }, 402);
    if (!res.ok || !res.body) {
      console.error("AI error", res.status, await res.text().catch(() => ""));
      return json({ error: "Falha na leitura automática" }, 502);
    }
    let text = "";
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const lineStr = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!lineStr.startsWith("data:")) continue;
        const payload = lineStr.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch { /* ignore */ }
      }
    }
    const data = text ? JSON.parse(text) : {};
    return json({ data });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
