// Living Colours — cliente partilhado para a API do Moloni (v1)
// Guarda e renova os tokens em public.moloni_credentials.
// Nunca expor tokens ao frontend.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MOLONI_BASE = "https://api.moloni.pt/v1";

export const CLIENT_ID = Deno.env.get("MOLONI_CLIENT_ID") ?? "";
export const CLIENT_SECRET = Deno.env.get("MOLONI_CLIENT_SECRET") ?? "";
export const MOLONI_USERNAME = Deno.env.get("MOLONI_USERNAME") ?? "";
export const MOLONI_PASSWORD = Deno.env.get("MOLONI_PASSWORD") ?? "";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface MoloniTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface StoredCredentials {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  company_id: number | null;
  company_name: string | null;
  account_email: string | null;
  last_connected_at: string | null;
}

/** Redirect URI a fornecer ao Moloni no fluxo authorization_code. */
export function callbackUrl(): string {
  const url = Deno.env.get("SUPABASE_URL")!;
  const ref = url.replace("https://", "").split(".")[0];
  return `https://${ref}.functions.supabase.co/moloni-oauth-callback`;
}

async function grant(params: Record<string, string>): Promise<MoloniTokens> {
  const qs = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    ...params,
  });
  const res = await fetch(`${MOLONI_BASE}/grant/?${qs.toString()}`);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do Moloni (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || json?.error || !json?.access_token) {
    const detail = json?.error_description || json?.error || text;
    throw new Error(`Autenticação Moloni falhou: ${detail}`);
  }
  return json as MoloniTokens;
}

export function tokensByPassword(): Promise<MoloniTokens> {
  if (!MOLONI_USERNAME || !MOLONI_PASSWORD) {
    throw new Error("MOLONI_USERNAME/MOLONI_PASSWORD não configurados.");
  }
  return grant({
    grant_type: "password",
    username: MOLONI_USERNAME,
    password: MOLONI_PASSWORD,
  });
}

export function tokensByCode(code: string, redirectUri?: string): Promise<MoloniTokens> {
  return grant({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri ?? callbackUrl(),
  });
}

export function tokensByRefresh(refreshToken: string): Promise<MoloniTokens> {
  return grant({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export async function loadCredentials(sb: SupabaseClient): Promise<StoredCredentials | null> {
  const { data } = await sb
    .from("moloni_credentials")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();
  return (data as StoredCredentials) ?? null;
}

export async function saveTokens(
  sb: SupabaseClient,
  tokens: MoloniTokens,
  extra: Partial<Pick<StoredCredentials, "company_id" | "company_name" | "account_email">> = {},
): Promise<StoredCredentials> {
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  const { data, error } = await sb
    .from("moloni_credentials")
    .upsert(
      {
        singleton: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        last_connected_at: new Date().toISOString(),
        ...extra,
      },
      { onConflict: "singleton" },
    )
    .select()
    .single();
  if (error) throw new Error(`Não foi possível guardar os tokens: ${error.message}`);
  return data as StoredCredentials;
}

/** Devolve um access token válido, renovando-o quando necessário. */
export async function getAccessToken(sb: SupabaseClient): Promise<string> {
  const creds = await loadCredentials(sb);
  const stillValid =
    creds?.access_token &&
    creds.expires_at &&
    new Date(creds.expires_at).getTime() - Date.now() > 60_000;
  if (stillValid) return creds!.access_token!;

  if (creds?.refresh_token) {
    try {
      const tokens = await tokensByRefresh(creds.refresh_token);
      const saved = await saveTokens(sb, tokens);
      return saved.access_token!;
    } catch (err) {
      // refresh token expirado (14 dias) — tenta password grant se disponível
      if (!MOLONI_USERNAME || !MOLONI_PASSWORD) throw err;
    }
  }

  const tokens = await tokensByPassword();
  const saved = await saveTokens(sb, tokens);
  return saved.access_token!;
}

/** Serializa em form-urlencoded, com notação de parênteses para estruturas. */
function appendForm(form: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendForm(form, `${key}[${i}]`, v));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      appendForm(form, `${key}[${k}]`, v);
    }
    return;
  }
  form.append(key, String(value));
}

/** Chamada autenticada a um endpoint do Moloni (ex: "companies/getAll"). */
export async function moloniCall<T = any>(
  sb: SupabaseClient,
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const token = await getAccessToken(sb);
  // A API do Moloni espera application/x-www-form-urlencoded.
  const formBody = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) appendForm(formBody, key, value);

  const res = await fetch(
    `${MOLONI_BASE}/${endpoint}/?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    },
  );

  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Resposta inválida de ${endpoint} (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || (json && json.error)) {
    const detail = json?.error_description || json?.human_errors || json?.error || text;
    throw new Error(`Moloni ${endpoint}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  return json as T;
}

export async function logSync(
  sb: SupabaseClient,
  entry: {
    entity: string;
    entity_id?: string | null;
    action: string;
    success: boolean;
    message?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  await sb.from("moloni_sync_log").insert({
    entity: entry.entity,
    entity_id: entry.entity_id ?? null,
    action: entry.action,
    success: entry.success,
    message: entry.message ?? null,
    payload: entry.payload ?? {},
  });
}

/** Valida o JWT e exige role manager/admin. Devolve o user id. */
export async function requireManager(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) throw new Error("UNAUTHORIZED");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error } = await sb.auth.getUser();
  if (error || !userData?.user) throw new Error("UNAUTHORIZED");

  const admin = adminClient();
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  const allowed = (roles ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "manager");
  if (!allowed) throw new Error("FORBIDDEN");
  return userData.user.id;
}
