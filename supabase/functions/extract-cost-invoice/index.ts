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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Extrais dados de faturas portuguesas de fornecedores. Usa o QR code fiscal se legível. Datas em YYYY-MM-DD, valores em euros com ponto decimal. Não inventes: deixa vazio o que não vês. Para a categoria escolhe o código mais provável da lista dada.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Categorias possíveis (código: nome):\n${categories.join("\n")}` },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "invoice",
              parameters: {
                type: "object",
                properties: {
                  supplier_name: { type: "string" },
                  supplier_nif: { type: "string" },
                  buyer_nif: { type: "string" },
                  invoice_number: { type: "string" },
                  atcud: { type: "string" },
                  invoice_date: { type: "string" },
                  due_date: { type: "string" },
                  total_net: { type: "number" },
                  total_vat: { type: "number" },
                  total_gross: { type: "number" },
                  vat_rate: { type: "number", description: "Taxa principal de IVA, ex. 23" },
                  category_code: { type: "string" },
                  description: { type: "string", description: "Descrição curta do serviço/produto" },
                  confidence: { type: "string", enum: ["low", "high"] },
                },
                required: ["confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "invoice" } },
      }),
    });
    if (res.status === 429) return json({ error: "Muitos pedidos, tenta daqui a pouco" }, 429);
    if (res.status === 402) return json({ error: "Créditos de IA esgotados" }, 402);
    if (!res.ok) return json({ error: "Falha na leitura automática" }, 502);
    const out = await res.json();
    const args = out?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const data = args ? JSON.parse(args) : {};
    return json({ data });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
