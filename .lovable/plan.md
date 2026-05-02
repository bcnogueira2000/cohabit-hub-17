# Living Colours — estado atual

## Concluído nesta sessão (QA / estabilização)
- DB: adicionada coluna `assigned_to_user_id` em `ops_tasks`, `cleaning_tasks`, `requests` (FK lógica para `auth.users`).
- `NewTaskDialog`: dropdown de staff em vez de input texto livre (grava nome + user_id).
- `RequestDetail` (staff): Select de atribuição grava nome + user_id.
- `MyDay`: corrigido o bug do filtro "minhas". Novo toggle "Hoje / Atribuídas a mim" usando `auth.uid()` em vez da heurística de email.
- Edge function `seed-demo-admin` (sandra.teste@livingcolours.test / demo1234, role admin) + botão em Aprovações.
- Home residente: estado dos pedidos traduzido (PT/EN).
- Detalhe de pedido residente: badge de estado traduzida + botão "Cancelar pedido" (fecha o pedido).
- Bookings já validavam overlap antes de inserir (verificado).
- Sino de notificações já mostra contagem real (verificado).

## Pendente / próximos passos sugeridos
1. Traduzir o estado em `MyStay.tsx` e `resident/Requests.tsx` (ainda usam `.replace(/_/g, " ")`).
2. Migrar progressivamente `assigned_to` (texto) para `assigned_to_user_id` em todos os pontos: filtros, exports, "minhas tarefas".
3. Detalhe de tarefa staff com checklist editável + foto antes/depois (Cleaning).
4. Insights ligado a dados reais.
5. Tier 2 (Eventos, Serviços extra) — só depois de testes com utilizadores reais.
6. Faturação (Stripe) — gap maior vs softwares pagos.

## Recap de arquitetura
- Mesma codebase, dois portais: staff (`/`) e residente (`/app/...`), separados por `ProtectedRoute` + role.
- Backend: Lovable Cloud (RLS + triggers automáticos para tarefas).
- Notificações: realtime + polling + bell badge.
- i18n PT/EN via `useLang`.
