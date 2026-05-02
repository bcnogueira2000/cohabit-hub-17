
# Resident Portal — Plano de Implementação

## Resumo executivo

O documento alinha 90% com o que já temos (requests, cleaning, bookings, stays, rooms, residents). O que falta é **uma segunda experiência mobile-first** sobre a mesma BD, com **roles**, **aprovação de contas**, e três módulos novos: **eventos**, **serviços (catálogo)** e **notificações in-app**. Mais FAQs e Onboarding como conteúdo gerido.

Proponho construir em **4 fases**, podendo parar/validar entre cada uma.

---

## Arquitetura

- **Mesmo projeto Lovable, mesma BD.** Dois "shells":
  - `AppShell` (já existe) → continua a servir `/admin/*` (renomeamos as rotas atuais para ficar claro) e mantém atalhos.
  - `ResidentShell` (novo) → bottom nav 5 tabs, layout mobile-first, em `/app/*`.
- **Login único** em `/auth` (já existe). Após login, hook lê o role e redireciona:
  - `resident` → `/app/home`
  - `staff` / `manager` / `admin` → `/` (dashboard atual)
  - `pending_approval` → `/app/pending-approval`
- **Segurança**: roles em tabela separada `user_roles` + função `has_role()` (security definer). Todas as RLS dos módulos do residente usam `has_role(auth.uid(), 'resident')` + filtros por `resident_id` ligado ao user.

---

## Fase 1 — Fundações: Roles, signup e aprovação

**Objetivo:** ter a base de autorização e a porta de entrada do residente.

### Base de dados (migração)
- Enum `app_role` (`resident`, `staff`, `manager`, `admin`).
- Enum `account_status` (`pending_approval`, `active`, `rejected`, `disabled`).
- Tabela `user_roles (id, user_id → auth.users, role, created_at)` com unique `(user_id, role)`.
- Tabela `profiles (user_id PK, full_name, email, phone, account_status, resident_id?, requested_room_number?, expected_move_in?, created_at)`.
- Coluna `residents.user_id` (FK lógico para `auth.users`) — liga residente real ao login.
- Função `has_role(_user_id, _role)` (security definer) e `current_resident_id()` que devolve `residents.id` para o utilizador autenticado.
- Trigger `handle_new_user()` em `auth.users` → cria `profiles` com status `pending_approval`.
- **Rever todas as RLS existentes** para usarem `has_role`:
  - Staff (`staff|manager|admin`): full read/write como hoje.
  - Resident: read/write apenas das próprias linhas (`resident_id = current_resident_id()`).

### Frontend
- `/signup` — formulário (nome, email, password, telefone, nº quarto opcional, data prevista entrada).
- `/app/pending-approval` — ecrã de espera.
- Atualizar `ProtectedRoute` para suportar `requireRole` e redirecionar conforme role/status.
- No dashboard atual: nova página **Settings → Aprovações** (lista de `profiles` com `pending_approval` → aprovar/rejeitar; aprovar pede para escolher/criar `resident` e atribuir `room`, e insere role `resident` em `user_roles`).

---

## Fase 2 — Resident Portal core: Home, Requests, Bookings

**Objetivo:** o residente já consegue substituir o WhatsApp para o essencial.

### Layout
- `ResidentShell` com bottom nav: **Home | Requests | Bookings | Events | More**.
- Top bar minimal com saudação ("Hi, {nome}") e sino de notificações.
- Tipografia/cores reutilizam tokens existentes (já temos paleta soft, OK).

### Rotas
- `/app/home` — saudação, atalhos (New request / Book space / Services / Events), preview de pedidos ativos, próxima reserva, próximo evento, últimas notificações.
- `/app/requests`, `/app/requests/new`, `/app/requests/:id` — reaproveita tabela `requests`. Filtra por `resident_id = current_resident_id()`. Categorias do doc (Maintenance, Cleaning, Noise, Access, Laundry, Bathroom, Wifi, Lost & Found, Other). Campo `permission_to_enter` já existe. Detalhe mostra timeline e `public_notes` (nova coluna `public_notes text`; `description` continua interna+pública conforme já está, mas adicionamos `internal_notes` para staff).
- `/app/bookings`, `/app/bookings/new` — reaproveita `spaces` + `bookings`. Validação anti-overlap (constraint exclusion ou check em trigger). Estado `requested|confirmed|cancelled` (novo enum) — adicionar coluna `status` em `bookings`.
- `/app/profile` — ver/editar dados básicos do `profiles` + `residents` ligados.

### Pequenas adições à BD
- `requests.public_notes text`, `requests.internal_notes text`.
- `bookings.status` enum + `bookings.purpose`, `bookings.people_count`, `bookings.guests_included bool`.

---

## Fase 3 — Serviços, Eventos, Notificações

**Objetivo:** cobrir o resto do MVP funcional.

### Serviços (catálogo de add-ons)
- Tabela `service_offerings (id, name, description, price_cents?, category, active)`.
- `/app/services` — lista de cards: Extra Room Cleaning, Deep Cleaning, Fresh Towels, Bedding Kit, Full Entry Kit, Laundry.
- Pedir um serviço cria automaticamente um `request` com categoria `add_on_service` ou `cleaning` — entra no fluxo já automatizado (gera `cleaning_task` ou `ops_task`).
- Admin: nova página `/services-catalog` para editar a oferta.

### Eventos
- Tabelas `events (id, title, description, host, starts_at, ends_at, location, capacity, cover_image_url, status)` e `event_rsvps (id, event_id, resident_id, status: going|not_going|maybe, created_at)` com unique `(event_id, resident_id)`.
- `/app/events`, `/app/events/:id` — listas Upcoming / My RSVPs / Past, RSVP com contagem de spots left.
- Admin: nova página `Events` (criar, editar, cancelar, ver RSVPs, enviar notificação ao publicar/lembrar).

### Notificações in-app
- Tabela `notifications (id, recipient_user_id, type, title, body, link, read_at, created_at)`.
- `/app/notifications` — lista; badge no sino com não-lidas.
- Triggers que criam notificações:
  - `requests` status change → notifica residente.
  - `bookings` confirmed/cancelled → notifica residente.
  - `events` publicado → notifica todos os residentes ativos.
- Realtime via Supabase Realtime no canal `notifications` filtrado pelo user.

---

## Fase 4 — Conteúdo: Onboarding, FAQs, polish

- Tabelas `faqs (id, question, answer, category, order, published)` e `onboarding_sections (id, title, body_md, order, published)`.
- `/app/faqs` com search; `/app/onboarding` com secções (Welcome, How to get help, How requests work, Bookings, Services, Events, House rules, Contacts).
- Admin: editor simples para FAQs e Onboarding em `Settings`.
- Polish: empty states, skeletons, animações suaves, PWA básico (manifest + ícones — sem service worker complexo) para "Add to Home Screen".

---

## Detalhes técnicos relevantes

- **Sem chat nos tickets** (out of scope do MVP) — apenas `public_notes`.
- **Sem pagamentos** — serviços ficam em "pending confirmation" para a equipa.
- **RLS resident model**:
  ```text
  has_role(auth.uid(), 'resident') AND resident_id = current_resident_id()
  ```
  Para `events` e `faqs`/`onboarding`: leitura aberta a qualquer `resident` autenticado.
- **Sem bagunçar o que já existe**: as automações atuais (triggers de stays, requests → tasks/cleaning) ficam intactas. Só adicionamos os novos triggers de notificações.
- O dashboard atual passa a viver em `/admin/*` apenas se quiseres — para minimizar churn, **proponho manter as rotas atuais como estão** e adicionar `/app/*` em paralelo. Redireção pós-login decide qual.

---

## Perguntas antes de começar

1. **Confirmação dos requisitos de signup**: aceitas que o residente se registe livremente e fique `pending_approval` até ser ligado a um `resident` existente (vindo de uma `stay`)? Ou preferes signup só por convite (link único enviado pelo admin)?
2. **PWA**: incluir já ícone "instalável" no telemóvel na Fase 4, ou deixar para depois?
3. **Eventos com imagem de capa**: queres upload (storage bucket) ou por agora só URL?
4. **Idioma**: a UI atual mistura PT/EN. O Resident Portal fica em **PT** (residentes locais) ou **EN** (mais "boutique" / internacional)?

Diz-me as respostas e arranco pela **Fase 1** (roles + signup + aprovação) — é o desbloqueador de tudo o resto.
