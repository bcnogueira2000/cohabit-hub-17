## Fase 2 — Pedidos e Reservas no portal do residente

A Fase 1 só montou as fundações (auth, roles, shell mobile, home). Agora ligamos as duas funcionalidades core que os residentes vão usar todos os dias.

### 1. Pedidos (Requests)

**`/app/requests` — Lista**
- Lista todos os pedidos do residente atual (RLS já filtra por `current_resident_id()`).
- Cards com código (REQ-001), título, categoria, prioridade, status com cor.
- Tabs: "Ativos" / "Arquivados" (resolvidos + cancelados).
- Empty state com CTA "Criar pedido".
- Pull-to-refresh / loading skeleton.

**`/app/requests/new` — Criar**
Formulário mobile-friendly com:
- **Categoria** (cards visuais): Manutenção, Limpeza, Wi-Fi/Tech, Lost & Found, Consumíveis, Outro.
- **Título** (obrigatório).
- **Descrição** (textarea).
- **Localização** (default: o quarto do residente; opção "Áreas comuns" + texto livre).
- **Prioridade** (low/medium/high — sem "urgent" para residentes; só staff define urgent).
- **Permissão para entrar no quarto** (yes/no/scheduled).
- Submit insere com `resident_id = current_resident_id()` e `status='open'`.
- Os triggers existentes (`auto_create_from_request`) criam automaticamente a tarefa de ops/cleaning.

**`/app/requests/:id` — Detalhe**
- Header com código, título, status (badge colorido) e data.
- Bloco com categoria, prioridade, localização, descrição.
- Timeline simples (created → in_progress → resolved) com base no status atual.
- Para já sem comentários (deixar para Fase 3).

### 2. Reservas de espaços (Bookings)

**`/app/bookings` — Lista**
- Próximas reservas + histórico (tabs).
- Cards com nome do espaço, dia, hora, duração.
- Botão "Cancelar" para reservas futuras (RLS já permite delete próprias).

**`/app/bookings/new` — Criar reserva**
- **Selecionar espaço**: lista visual de `spaces` (Sala de cinema, Coworking, Cozinha, etc.) com capacidade.
- **Data**: date picker.
- **Início e fim**: time pickers (slots de 30min).
- **Título** opcional + notas.
- Validação client-side: end > start, sem sobreposição com reservas existentes do mesmo espaço (query rápida ao supabase).
- Submit insere com `resident_id = current_resident_id()`.

### 3. Home — atualizar quick actions
- Os botões de "Novo pedido" e "Reservar espaço" na home passam a navegar para os ecrãs reais (já estão lá os links, vão começar a funcionar).
- Secção "Pedidos ativos" passa a mostrar dados reais (já usa `useResidentRequests`, basta confirmar).
- Secção "Próximas reservas" idem.

### 4. Hooks novos
- `useMyRequests()` — lista pedidos do residente
- `useCreateRequest()` — insert
- `useRequest(id)` — detalhe
- `useMyBookings()` — lista reservas
- `useSpaces()` — lista espaços disponíveis (já existe `read` para `authenticated`)
- `useCreateBooking()` / `useCancelBooking()`

### 5. i18n
- Adicionar strings PT+EN para todos os novos ecrãs em `src/lib/i18n.ts`.

### Não-incluído nesta fase (fica para Fase 3+)
- Comentários/chat nos pedidos
- Anexos/fotos nos pedidos
- Push notifications
- Eventos, FAQs, Onboarding, Perfil, Serviços extra

### Ficheiros
- **Criar:**
  - `src/hooks/useResidentRequests.ts`
  - `src/hooks/useResidentBookings.ts`
  - `src/pages/resident/Requests.tsx`
  - `src/pages/resident/RequestNew.tsx`
  - `src/pages/resident/RequestDetail.tsx`
  - `src/pages/resident/Bookings.tsx`
  - `src/pages/resident/BookingNew.tsx`
- **Editar:**
  - `src/App.tsx` (substituir `ComingSoon` por componentes reais nas rotas de pedidos e reservas)
  - `src/pages/resident/Home.tsx` (ligar dados reais se ainda não tiver)
  - `src/lib/i18n.ts`
