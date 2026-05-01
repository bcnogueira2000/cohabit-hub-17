## Plano: Cloud + Automatismos + Vista Mobile Staff

Vamos abordar os 3 pontos prioritários, na ordem que faz mais sentido técnico.

---

### Etapa 1 — Ativar Lovable Cloud + Autenticação

**Auth simples (sem tabela de profiles, sem papéis):**
- Email + password
- Google sign-in
- Página `/auth` com tabs Login / Sign-up
- Página `/reset-password` (obrigatória)
- `ProtectedRoute` que envolve o `AppShell` — se não autenticado, redireciona para `/auth`
- Rota `/submit` (pedido público de residente) e `/auth` ficam fora da proteção

**Schema inicial (tabelas com RLS "authenticated users only"):**
- `requests` — espelha `Request` em `types.ts`
- `ops_tasks` — espelha `OpsTask`
- `cleaning_tasks` — espelha `CleaningTask` (com `service`, `source`, `source_ref`, `checklist` jsonb)
- `residents`, `rooms`, `bookings`, `spaces`

RLS: qualquer utilizador autenticado pode ler/escrever (staff interno, sem segregação por papel para já — fica preparado para adicionar `user_roles` mais tarde quando quiseres distinguir limpeza/manutenção/admin).

**Migração de dados:** seed inicial com o conteúdo atual de `mockData.ts` para a base não ficar vazia.

**Hooks de dados:** substituir os imports diretos de `mockData` por hooks `useRequests()`, `useTasks()`, `useCleaningTasks()`, etc. usando `@tanstack/react-query` + supabase client. O `tasksStore` é removido.

---

### Etapa 2 — Automatismos request → task / cleaning

Comportamento: **automático com edição** (cria sempre, admin pode editar/eliminar antes de atribuir).

**Regras (executadas via Postgres trigger `AFTER INSERT ON requests`):**

| Categoria do pedido          | Cria automaticamente                                  |
|------------------------------|-------------------------------------------------------|
| `maintenance`                | `ops_task` (categoria=maintenance, prioridade herdada) |
| `cleaning`                   | `cleaning_task` (service=normal, source=request)      |
| `consumables`                | `cleaning_task` (service=simple, source=request)      |
| `wifi_tech`                  | `ops_task` (categoria=maintenance)                    |
| `noise` / `billing` / outros | `ops_task` (categoria=admin)                          |

Cada item criado guarda `request_id` para rastreabilidade. Banner no detalhe do pedido: "Tarefa T-XXX criada automaticamente — [ver]". Admin pode arquivar/eliminar a task gerada sem afetar o pedido.

**Trigger adicional `residents`:** quando `status` muda para `checking_out`, cria automaticamente:
- `cleaning_task` tipo `checkout_inspection` (service=normal, source=checkout)
- `ops_task` "Inspeção saída quarto X" + "Devolução de caução"

---

### Etapa 3 — Vista mobile `/my-day`

Rota dedicada otimizada para telemóvel, dentro do `AppShell` (mesma auth).

**Layout:**
- Header curto: data + nome do utilizador autenticado + botão filtro (Todas / Limpeza / Manutenção)
- Lista cronológica única misturando `cleaning_tasks` e `ops_tasks` do dia, ordenada por hora
- Cada item: hora, área/quarto, tipo, badge de prioridade, status
- Tap no item abre **bottom sheet** com:
  - Descrição completa
  - Checklist tickável (para limpezas) — sync imediato à BD
  - Notas (textarea)
  - Botões grandes: "Iniciar" → "Concluir" / "Bloquear"
- Pull-to-refresh

**Filtro inicial:** mostra tarefas atribuídas a `assigned_to` que corresponde ao email do user logado, com fallback "ver todas".

Link `/my-day` adicionado ao menu lateral com ícone próprio. URL partilhável para a equipa abrir no telemóvel após login.

---

### Detalhes técnicos

```text
src/
├── integrations/supabase/   (gerado pela Cloud)
├── hooks/
│   ├── useAuth.tsx          listener onAuthStateChange + getSession
│   ├── useRequests.ts       react-query CRUD
│   ├── useTasks.ts
│   └── useCleaningTasks.ts
├── components/
│   ├── ProtectedRoute.tsx
│   └── mobile/
│       ├── MyDayList.tsx
│       └── TaskBottomSheet.tsx
├── pages/
│   ├── Auth.tsx
│   ├── ResetPassword.tsx
│   └── MyDay.tsx
└── lib/
    └── tasksStore.ts        REMOVIDO
```

**Migrations SQL:**
1. Criar enums (`request_status`, `request_priority`, `cleaning_service`, etc.)
2. Criar 7 tabelas com FKs
3. Habilitar RLS + policies (`authenticated` pode tudo)
4. Trigger `auto_create_task_from_request()`
5. Trigger `auto_create_checkout_tasks()`
6. Seed dos dados mock

**Mock data:** `mockData.ts` mantém-se como referência para o seed mas deixa de ser usado em runtime.

---

### Fora do âmbito (próximas etapas, não agora)

- Tabela `user_roles` e segregação por papel
- Notificações por email
- Inventário de consumíveis
- Portal do residente
- Anexos/fotos

---

Aprovas para avançar?