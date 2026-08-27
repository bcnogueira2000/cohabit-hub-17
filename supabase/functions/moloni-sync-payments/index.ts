// Living Colours — importa do Moloni o estado de pagamento dos documentos
// emitidos e cria os registos em public.payments.
// Body opcional: { rent_charge_id?: uuid }  (sem body: sincroniza todos os pendentes)
// Pode ser chamado por um agendamento com o header x-cron-secret.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, logSync, moloniCall, requireManager } from "../_shared/moloni.ts";
import { loadSettings } from "../_shared/moloniSettings.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const METHOD_MAP: Record<string, string> = {
  transferencia: "transfer",
  "transferência": "transfer",
  mbway: "mbway",
  "multibanco": "transfer",
  numerario: "cash",
  "numerário": "cash",
  dinheiro: "cash",
  cheque: "other",
  "cartao": "card",
  "cartão": "card",
};

function mapMethod(name?: string | null): string {
  if (!name) return "other";
  const key = name.toLowerCase().trim();
  for (const [needle, value] of Object.entries(METHOD_MAP)) {
    if (key.includes(needle)) return value;
  }
  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const cronSecret = Deno.env.get("MOLONI_CRON_SECRET");
  const isCron = Boolean(cronSecret) && req.headers.get("x-cron-secret") === cronSecret;

  if (!isCron) {
    try {
      await requireManager(req);
    } catch (err) {
      const msg = (err as Error).message;
      return json(
        { error: msg === "FORBIDDEN" ? "Sem permissões" : "Não autenticado" },
        msg === "FORBIDDEN" ? 403 : 401,
      );
    }
  }

  const sb = adminClient();
  let onlyCharge: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.rent_charge_id) onlyCharge = String(body.rent_charge_id);
  } catch {
    // sem body — sincroniza todos
  }

  try {
    const settings = await loadSettings(sb);

    let query = sb
      .from("rent_charges")
      .select("id, contract_id, amount, moloni_document_id, moloni_status")
      .not("moloni_document_id", "is", null)
      .neq("moloni_status", "paid")
      .limit(200);
    if (onlyCharge) query = query.eq("id", onlyCharge);

    const { data: charges, error } = await query;
    if (error) throw new Error(error.message);

    let paid = 0;
    const errors: string[] = [];

    for (const charge of charges ?? []) {
      try {
        const doc = await moloniCall<any>(sb, "documents/getOne", {
          company_id: settings.companyId,
          document_id: charge.moloni_document_id,
        });

        const docPayments: any[] = Array.isArray(doc?.payments) ? doc.payments : [];
        const totalPaid = docPayments.reduce((sum, p) => sum + Number(p.value ?? 0), 0);
        const total = Number(doc?.net_value ?? charge.amount);
        const isPaid = totalPaid > 0 && totalPaid + 0.01 >= total;
        if (!isPaid) continue;

        const reference = doc?.document_set_name && doc?.number
          ? `${doc.document_set_name}/${doc.number}`
          : `Moloni #${charge.moloni_document_id}`;

        const { data: existing } = await sb
          .from("payments")
          .select("id")
          .eq("rent_charge_id", charge.id)
          .eq("reference", reference)
          .maybeSingle();

        if (!existing) {
          const first = docPayments[0] ?? {};
          const paidAt = (first.date ?? doc?.date ?? new Date().toISOString()).slice(0, 10);
          const { error: insertError } = await sb.from("payments").insert({
            contract_id: charge.contract_id,
            rent_charge_id: charge.id,
            kind: "rent",
            amount: totalPaid,
            paid_at: paidAt,
            method: mapMethod(first.payment_method_name ?? first.name),
            reference,
            notes: "Importado do Moloni",
          });
          if (insertError) throw new Error(insertError.message);
        }

        await sb
          .from("rent_charges")
          .update({ moloni_status: "paid", moloni_paid_synced_at: new Date().toISOString() })
          .eq("id", charge.id);
        paid += 1;
      } catch (err) {
        errors.push(`${charge.id}: ${(err as Error).message}`);
      }
    }

    await logSync(sb, {
      entity: "payments",
      action: "sync_payments",
      success: errors.length === 0,
      message: errors.length ? errors.slice(0, 5).join(" | ") : `${paid} pagamento(s) importado(s)`,
      payload: { checked: charges?.length ?? 0, paid, errors: errors.length },
    });

    return json({ ok: true, checked: charges?.length ?? 0, paid, errors });
  } catch (err) {
    const message = (err as Error).message;
    await logSync(sb, { entity: "payments", action: "sync_payments", success: false, message });
    return json({ error: message }, 400);
  }
});
