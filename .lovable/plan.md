# Receber leads do site diretamente na app

O teu site (Vercel) passa a enviar cada formulário submetido para um endpoint desta app. A lead aparece na página de Leads em segundos, com origem "website_form".

## Como vai funcionar

```text
Formulário no site (Vercel)
      |  POST JSON + chave secreta
      v
Endpoint público "lead-intake" (backend da app)
      |  valida, normaliza, deteta duplicados
      v
Tabela de leads  ->  Página /leads (estado "Novos")
```

## O que vou construir

1. **Endpoint público de entrada de leads** (`lead-intake`)
   - Aceita POST com JSON (nome, email, telefone, nacionalidade, perfil, tipo de quarto preferido, data de entrada pretendida, duração, orçamento, mensagem, idioma, consentimento RGPD, e campos de campanha/origem).
   - Valida com Zod: email obrigatório e válido, nome obrigatório, limites de tamanho, consentimento RGPD.
   - Rejeita pedidos sem a chave secreta partilhada (header `x-api-key`), para ninguém poder injetar leads falsos.
   - Proteção anti-spam simples: campo honeypot opcional + limite de pedidos por IP por minuto.
   - Deduplicação: se já existir uma lead com o mesmo email num estado ativo, em vez de criar duplicado registo uma nova entrada no histórico dessa lead com os dados novos.
   - Cria a lead com `source = website_form`, estado `new`, e guarda o `source_detail` (ex: nome do formulário/página) e `external_ref` se enviado.
   - Responde `200 {ok:true, leadId}` ou `400` com erros claros.

2. **Chave secreta**
   - Vou pedir-te para guardar um segredo (`LEAD_INTAKE_API_KEY`) que depois colocas nas variáveis de ambiente do projeto Vercel.

3. **Página de Leads**
   - Nada muda estruturalmente; as leads novas entram no separador/coluna "Novos".
   - Adiciono atualização automática (refetch periódico + ao voltar à janela) para não ser preciso recarregar.

4. **Instruções de integração**
   - No fim dou-te o exemplo de código pronto a colar no teu site (route handler / fetch no submit), com o URL do endpoint e o header da chave.

## Notas técnicas

- Edge function em `supabase/functions/lead-intake/index.ts`, com CORS e `verify_jwt = false` (é chamado por um servidor externo).
- Insere via service role, pelo que não é preciso abrir políticas de escrita anónima na tabela `leads` — a segurança fica na chave.
- Reutiliza os enums existentes `lead_source` e `lead_status`; campos desconhecidos vão para `notes` para não perder informação.
- Registo em `lead_activity` com `kind = "created_from_website"` (e `"duplicate_submission"` no caso de repetição).
- Recomendo chamares o endpoint do **servidor** do teu site (route handler no Vercel), não do browser, para a chave não ficar exposta.

## Fora de âmbito (posso fazer depois)

- Notificação por email/Slack a cada nova lead.
- Atribuição automática de responsável por regras.
