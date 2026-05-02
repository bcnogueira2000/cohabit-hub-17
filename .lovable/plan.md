# Revisão geral — Living Colours

## 1. Estado atual (funcional)

### O que está estável e a funcionar bem
- **Auth + papéis**: signup com aprovação pendente, papéis `resident` / `staff` / `manager` / `admin`, RLS com `is_staff()` e `current_resident_id()` corretamente isolados.
- **Pedidos (requests)**: residente cria → trigger `auto_create_from_request` gera 1 tarefa (ops ou cleaning) sem duplicações. Confirmado em DB: REQ-004 → T-006, sem órfãos.
- **Estadias (stays)**: triggers `stay_prepare_checkin` e `stay_handle_checkout` criam tarefas de preparação e devolução de caução automaticamente.
- **Portal residente**: navegação inferior, Home com pedidos ativos + próxima reserva, criação de pedidos e bookings, i18n PT/EN.
- **Portal staff**: Dashboard, Requests com filtros + ações rápidas (botão ativo agora destacado), Tasks, Cleaning, Rooms, Residents, Stays, Approvals, Users, Bookings, Insights.
- **Base de dados**: 6 residentes, 8 quartos, 6 reservas, 5 limpezas, 4 tarefas, 2 pedidos. Sem triggers duplicados, sem inconsistências.

### Problemas / pontos fracos identificados

**A. Avisos do linter de segurança (11 warnings, todos não críticos)**
- 1× política RLS demasiado permissiva (`public insert requests` com `WITH CHECK (true)` para `anon`) — pretendido para o formulário público, mas vale a pena mitigar com rate-limit ou um campo honeypot.
- 9× `SECURITY DEFINER` em funções públicas (`has_role`, `is_staff`, `current_resident_id`, etc.) — necessário para o funcionamento, mas devíamos `REVOKE EXECUTE FROM anon` nas que só servem utilizadores autenticados.

**B. Áreas marcadas "Em breve" ainda sem conteúdo (residente)**
- Eventos, Serviços, Notificações, Onboarding, FAQs, Perfil — todas mostram `ComingSoon`.

**C. Lacunas funcionais visíveis**
- **Sem notificações reais**: quando staff muda estado de pedido, residente não é avisado. O sino existe mas só aponta para placeholder.
- **Sem upload de fotos/anexos** no pedido — comum em queixas de avaria ("torneira a pingar" beneficiaria muito de foto).
- **"Atribuir a"** é campo de texto livre — devia ser uma lista de utilizadores staff (foreign key a `user_roles` / `profiles`).
- **Tasks (staff)** não permitem mudar estado nem ver detalhe — é só listagem.
- **Cleaning tasks** idem: só listagem, sem fluxo de execução (iniciar / completar / checklist).
- **Stays**: lista existe mas não há fluxo claro de "novo check-in" no UI staff (apenas via página pública).
- **Insights**: dashboard estático, sem KPIs reais ligados à BD.
- **Rooms**: gestão básica, mas sem histórico de ocupação.

**D. UX / pequenas melhorias**
- Card de pedido na Home do residente mostra `r.status.replace(/_/g, " ")` em vez de label PT/EN traduzida.
- Não há botão "Cancelar pedido" para o residente (apenas staff resolve).
- Bookings: não verifica conflitos de horário no mesmo `space_id` antes de inserir.
- Sem página de detalhe de booking nem possibilidade de editar/cancelar como residente (só apagar).

---

## 2. O que melhorar do que já existe (prioridade alta)

### Quick wins (1 sessão cada)
1. **Notificações no perfil residente**: marcar pedido como visto, badge no sino, lista cronológica das mudanças de estado.
2. **Upload de foto no pedido** (residente e público) — bucket privado + thumbnail no detalhe.
3. **Atribuir tarefa por dropdown** em vez de texto livre: ler de `user_roles` onde role IN (staff, manager, admin) + join com `profiles` para mostrar nome.
4. **Detalhe de tarefa staff** (`/tasks/:id`) com ações iniciar / pausar / concluir e notas.
5. **Verificar conflito de bookings**: validar overlap antes de inserir (RPC ou check no cliente).
6. **Tradução PT/EN consistente** em estados (`open`, `in_progress`, etc.) — já existe `labels.ts`, falta usar em algumas zonas (Home residente, cards diversos).

### Endurecimento de segurança
7. **Restringir SECURITY DEFINER**: `REVOKE EXECUTE ... FROM anon` nas funções que só servem autenticados.
8. **Rate-limit no formulário público** `/submit` (edge function que valida + insere, em vez de RLS aberta).

---

## 3. O que construir a seguir (sugestão priorizada)

### Tier 1 — completar a operação diária (próximas 2-3 sessões)
1. **Sistema de notificações** (in-app + email opcional)
   - Tabela `notifications` (user_id, type, title, body, link, read_at)
   - Trigger em `requests` quando `status` muda → cria notificação para o residente
   - Trigger em `requests` quando criado → notifica staff
   - Polling ou Realtime no sino
2. **Fluxo completo de tarefas staff** (Tasks + Cleaning)
   - Detalhe com checklist editável, foto antes/depois para limpeza
   - Drag-to-status board (Kanban) opcional em Tasks
3. **Atribuição estruturada** + página "As minhas tarefas" (já existe MyDay, falar a sério com filtros por `assigned_to = auth.uid()`)

### Tier 2 — experiência residente rica (sessões 4-6)
4. **Eventos da comunidade** (tabela `events`, RSVP, calendário)
5. **Serviços extra** (limpezas pagas, lavandaria) com pedido + estado
6. **Onboarding interativo** para novos residentes (passos: documentos, regras, tour)
7. **FAQs** dinâmicas (tabela editável pela equipa)
8. **Perfil residente** real: editar dados, foto, contactos de emergência

### Tier 3 — gestão e analytics (sessões 7-9)
9. **Insights ligado a dados reais**: ocupação, tempo médio de resolução de pedidos, satisfação, receita.
10. **Histórico de quarto** (linha temporal de ocupação, limpezas, manutenções).
11. **Faturação básica** (rendas, depósitos, extras) — provavelmente requer Stripe.
12. **Comunicações em massa**: email/push para anúncios da casa.

### Tier 4 — automação e qualidade
13. **Edge functions**: webhooks para n8n/Zapier, agendador de limpezas semanal, recordatórios de check-out.
14. **Testes**: smoke tests dos fluxos críticos (signup, pedido, booking).

---

## 4. Recomendação concreta para a próxima sessão

Sugiro atacarmos **Notificações** primeiro porque:
- Fecha o ciclo do pedido (residente cria → staff vê → residente é avisado da resolução).
- Resolve o sino vazio que já está visível.
- Toca em todos os papéis e dá retorno imediato.

Em paralelo, fechar dois quick wins: **dropdown de atribuição** e **upload de foto no pedido**.

## 5. Detalhes técnicos (referência)

- DB: nada partido. Triggers únicos. RLS coerente.
- Linter: 11 warnings, 0 críticos. Endereçar quando estabilizarmos features.
- Frontend: 22 páginas staff + 6 residente; 7 placeholders `ComingSoon`.
- Hooks bem isolados (`useData`, `useResidentRequests`, `useResidentBookings`, `useProfile`, `useAuth`).

---

**Confirma**: avançamos com Notificações + dropdown de atribuição + upload de foto, ou preferes outra ordem (ex: completar primeiro o fluxo Tasks/Cleaning, ou ligar Insights a dados reais)?
