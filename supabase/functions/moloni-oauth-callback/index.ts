// Living Colours — endpoint público de callback OAuth do Moloni.
// URL a fornecer ao Moloni como "redirect URI":
//   https://<ref>.functions.supabase.co/moloni-oauth-callback
// Recebe ?code=... , troca-o por tokens e guarda-os.

import { adminClient, logSync, saveTokens, tokensByCode } from "../_shared/moloni.ts";

const html = (title: string, message: string, ok: boolean) =>
  new Response(
    `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f5f2;color:#1c1c1c;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#fff;padding:2rem 2.25rem;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);max-width:28rem;text-align:center}
h1{font-size:1.1rem;margin:0 0 .5rem}p{font-size:.9rem;color:#555;margin:0}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:.5rem;background:${ok ? "#1f9d55" : "#c53030"}}</style>
</head><body><div class="card"><h1><span class="dot"></span>${title}</h1><p>${message}</p></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const sb = adminClient();

  if (error) {
    await logSync(sb, { entity: "auth", action: "oauth_callback", success: false, message: error });
    return html("Ligação recusada", `O Moloni devolveu: ${error}`, false);
  }
  if (!code) {
    return html("Pedido inválido", "Falta o parâmetro 'code' no pedido de retorno.", false);
  }

  try {
    const tokens = await tokensByCode(code);
    await saveTokens(sb, tokens);
    await logSync(sb, { entity: "auth", action: "oauth_callback", success: true });
    return html(
      "Moloni ligado com sucesso",
      "Podes fechar esta janela e voltar à aplicação para escolher a empresa.",
      true,
    );
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, { entity: "auth", action: "oauth_callback", success: false, message });
    return html("Não foi possível ligar", message, false);
  }
});
