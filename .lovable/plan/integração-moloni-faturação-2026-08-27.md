# Integração Moloni (faturação)

Ligar o projeto à API do Moloni para emitir faturas/recibos das rendas, sincronizar residentes como clientes e importar o estado de pagamento.

## Como funciona a autenticação (o que dizer ao Moloni)

A API do Moloni usa OAuth2. Existem dois caminhos:

- **Password grant (recomendado, mais simples)** — com `client_id`, `client_secret`, email e password da conta Moloni obtém-se o token diretamente. **Não é preciso URL nenhuma.**
- **Authorization code** — é aqui que o Moloni pede uma "URL de redirecionamento". Se insistirem nesta via, o plano cria esse endpoint e a URL a fornecer-lhes será:

```text
https://<projeto>.functions.supabase.co/moloni-oauth-callback
```

O plano implementa os dois: se existir `client_id`/`client_secret` + credenciais, usa password grant; se o Moloni só der o fluxo com redirect, o endpoint de callback já está pronto para receber o `code` e trocá-lo por tokens.

Importante: o *access token* do Moloni expira em 1 hora e o *refresh token* em cerca de 14 dias. Por isso os tokens ficam guardados no backend e são renovados automaticamente — nunca no browser.

## Fases

### Fase 1 — Ligação e teste (primeiro entregável)
- Tabela `moloni_credentials` (acesso apenas a admin/manager) para guardar `access_token`, `refresh_token`, expiração e `company_id`.
- Edge function `moloni-auth`: obtém tokens (password grant ou troca de `code`), guarda-os e devolve as empresas da conta.
- Edge function `moloni-oauth-callback`: recebe o `code` do fluxo com redirect.
- Módulo partilhado `_shared/moloni.ts`: cliente com renovação automática de token e chamadas à API.
- Página `/finance/moloni` (só admin/manager): estado da ligação, escolher a empresa, botão "Testar ligação" e "Reautenticar".

### Fase 2 — Sincronizar clientes
- Campo `moloni_customer_id` em `residents`.
- Function `moloni-sync-customer`: cria/atualiza o cliente no Moloni a partir do residente (nome, NIF, morada, email, país). Falta de NIF ou morada é sinalizada antes de enviar.
- Botão "Sincronizar com Moloni" na ficha do residente.

### Fase 3 — Emitir documentos das rendas
- Campos `moloni_document_id`, `moloni_document_number`, `moloni_status` em `rent_charges`.
- Function `moloni-issue-document`: emite fatura/fatura-recibo para uma renda (produto/serviço configurável, IVA, data de vencimento = `due_date`), grava o id e o número devolvidos.
- Em `/finance/payments` e no detalhe do contrato: botão "Emitir no Moloni", estado visível e link para o PDF.
- Emissão em lote por mês, com relatório de erros por renda.

### Fase 4 — Importar estado de pagamento
- Function `moloni-sync-payments`, corrida diária (pg_cron) e também manual: lê os documentos emitidos e, se pagos no Moloni, cria o registo em `payments` (evitando duplicados pela referência do documento).

## Notas técnicas

- Segredos necessários: `MOLONI_CLIENT_ID`, `MOLONI_CLIENT_SECRET` e, no password grant, `MOLONI_USERNAME` + `MOLONI_PASSWORD`. Pedidos com o formulário seguro quando chegarmos à Fase 1.
- Base da API: `https://api.moloni.pt/v1/`. Tokens só circulam no backend; o frontend chama sempre as edge functions.
- Todas as functions validam o JWT e exigem `admin`/`manager` via `has_role`.
- Cada operação com o Moloni registada em `moloni_sync_log` (entidade, ação, resultado, erro) para diagnóstico.
- Definições configuráveis em `app_settings`: `company_id`, tipo de documento, série, taxa de IVA, id do artigo "Renda".

## Próximo passo

Confirma com o Moloni se te dão `client_id` + `client_secret` (password grant, sem URL) ou se exigem o fluxo com redirect. Em qualquer dos casos posso começar a Fase 1 já — a URL de callback fica criada e pronta a entregar-lhes.
