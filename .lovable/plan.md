
# Fase 1 — Fundações operacionais

Esta fase entrega o esqueleto sobre o qual as fases seguintes (Contracts, Documents, Cleaning v2, Insights, Resident files, UX polish) vão encaixar sem reescrever schema.

Princípios:
- Não remove nada. Nada é destrutivo.
- `room_id` continua a existir em todas as tabelas atuais — adicionamos `location_id` em paralelo e fazemos backfill.
- Custos e supplier ficam invisíveis ao residente desde o dia 1.

---

## 1. Suppliers (novo módulo)

**Tabela `suppliers`**
- `name`, `category` (enum: `plumbing`, `electrical`, `cleaning_company`, `internet`, `laundry`, `maintenance`, `hvac`, `pest_control`, `gardening`, `security`, `other`)
- `contact_name`, `phone`, `email`, `website`
- `notes`, `active` (bool, default true)
- `tags` (text[])

**RLS:** staff full access. Residentes: sem acesso (nem SELECT).

**UI**
- Nova entrada na sidebar (secção "Pessoas" ou nova secção "Parceiros") com ícone `Truck` ou `Building2`.
- `/suppliers` — lista com filtros (categoria, ativo/inativo, search).
- `/suppliers/new` — formulário curto (drawer/dialog).
- `/suppliers/:id` — perfil com tabs:
  - **Visão geral**: contactos, notas.
  - **Pedidos ligados**: lista de requests onde este supplier foi atribuído.
  - **Tarefas ligadas**: ops_tasks + cleaning_tasks.
  - **Contratos** *(placeholder vazio, vem na Fase 2)*.
  - **Custos**: soma de `final_cost` dos requests, só visível a admin/manager.

---

## 2. Locations como tabela mãe

Decisão arquitetural: **`locations` é a entidade física canónica**. Rooms tornam-se um tipo de location, mantendo a tabela `rooms` para campos específicos de quarto (typology, monthly_price, etc.).

**Tabela `locations`**
- `name` (ex: "Cozinha 5º piso", "Quarto 5DQ1", "Lavandaria")
- `kind` (enum: `room`, `shared_bathroom`, `apartment_kitchen`, `common_kitchen`, `corridor`, `balcony`, `laundry`, `meeting_room`, `cowork`, `terrace`, `winter_garden`, `cinema`, `technical`, `other`)
- `floor` (int, nullable)
- `apartment` (text, nullable)
- `parent_location_id` (uuid, nullable — permite "Cozinha pertence ao Apartamento X")
- `status` (enum: `active`, `out_of_service`, `under_maintenance`)
- `notes`

**Tabela `rooms` — alterações**
- Adicionar `location_id uuid UNIQUE` (FK lógico para `locations.id`).
- **Migração de dados:** para cada `rooms` existente, criar um `locations` com `kind='room'`, `name='Quarto ' || number`, `floor=rooms.floor`, e ligar `rooms.location_id`.
- Manter todos os campos atuais de `rooms` (number, floor, typology, status, current_resident_id).

**Tabelas operacionais — adicionar `location_id`**
- `requests.location_id` (nullable, FK lógico)
- `ops_tasks.location_id`
- `cleaning_tasks.location_id`
- Backfill: para linhas com `room_id`, copiar `rooms.location_id` correspondente.
- `room_id` mantém-se para compatibilidade; novo código grava ambos quando aplicável.

**UI**
- Nova rota `/locations` (sidebar secção "Espaços") — lista agrupada por `kind`.
- `/locations/:id` — detalhe com tabs: Visão geral, Pedidos abertos, Histórico (cleaning), Documentos *(placeholder)*, Notas.
- **Formulário de pedido (`NewRequest` + `resident/RequestNew`)**: campo "Onde é o problema?" passa a oferecer:
  - Quarto (lista atual)
  - **OU** Local partilhado (dropdown de `locations` não-room)
- `RequestDetail` mostra Quarto **e/ou** Local consoante o que estiver preenchido.

---

## 3. Dual Assignment (Owner interno + Supplier externo)

**Schema**
- `requests`: adicionar `supplier_id uuid` (FK lógico). O campo `assigned_to_user_id` existente passa a representar oficialmente o **Internal Owner**.
- `ops_tasks`: igual (`supplier_id` + reusa `assigned_to_user_id`).
- `cleaning_tasks`: igual.

**Activity log mínimo (nova tabela `request_activity`)**
- `request_id`, `actor_user_id`, `kind` (enum: `supplier_assigned`, `supplier_removed`, `status_changed`, `owner_changed`, `cost_updated`), `payload jsonb`, `created_at`.
- Trigger em `requests` UPDATE escreve automaticamente para `supplier_id`, `assigned_to_user_id`, `status` e custos.
- RLS: staff full; residente lê apenas eventos `status_changed` dos próprios pedidos (filtragem via view).

**UI**
- `RequestDetail` (staff): card "Atribuir" passa a ter **dois selects** lado a lado: "Responsável interno" e "Fornecedor externo". Toast contextual ("Fornecedor atribuído").
- Mesma alteração em `Tasks` e `CleaningScheduleDialog`/detalhe de cleaning.
- Lista `/requests` e `/tasks`: nova coluna/badge "Supplier" quando preenchido; filtros adicionais (Internal owner, Supplier).
- Nova secção "Atividade" no `RequestDetail` mostrando o feed (resident vê só status changes).

---

## 4. Cost Tracking em Requests

**Schema**
- `requests`: `estimated_cost numeric(10,2)`, `final_cost numeric(10,2)`, `cost_currency text default 'EUR'`.
- `ops_tasks`: mesmos campos (preparar para Fase 2 de insights).

**RLS / acesso**
- Funções `has_role(uid, 'admin')` e `has_role(uid, 'manager')` já existem.
- **Decisão técnica**: como Postgres RLS não esconde colunas por role facilmente, mantemos os custos na linha mas **filtramos no client e no edge** — qualquer hook que devolva dados para o portal residente (`useResidentRequests`, etc.) faz `select` explícito sem `*_cost`. Para o residente nunca aparece nem na rede.
- View `resident_requests_v` para garantir que o portal só recebe colunas seguras (defesa em profundidade).

**UI**
- `RequestDetail` staff: novo card "Custos" visível **apenas** se `has_role(admin|manager)`. Dois inputs (estimado, final). Atualização escreve activity log.
- `requests` list: coluna opcional "Custo" toggleável, mesma regra de role.
- `SupplierDetail` agrega `SUM(final_cost)` por supplier.
- Portal residente: zero referências a custo.

---

## 5. Resident portal lock (preventivo)

- Auditar `src/pages/resident/*` e `src/hooks/useResident*.ts`: confirmar que nenhum query devolve `supplier_id`, `estimated_cost`, `final_cost`, `request_activity`.
- Adicionar testes leves (vitest) que verificam os `select(...)` dos hooks residentes não incluem colunas sensíveis.
- Sidebar do `ResidentShell`: nada novo aparece.

---

## Detalhes técnicos

### Migrações (ordem)
1. `create type supplier_category, location_kind, location_status, activity_kind`.
2. `create table suppliers` + RLS staff-only.
3. `create table locations` + RLS staff full / authenticated read básico (para o resident ver nome do local do seu pedido).
4. `alter table rooms add column location_id uuid unique`.
5. Backfill: `insert into locations ... from rooms`; `update rooms set location_id = ...`.
6. `alter table requests/ops_tasks/cleaning_tasks add column location_id uuid, supplier_id uuid`.
7. Backfill `location_id` a partir de `room_id`.
8. `alter table requests/ops_tasks add column estimated_cost, final_cost, cost_currency`.
9. `create table request_activity` + RLS + trigger `log_request_changes()`.
10. `create view resident_requests_v` com whitelist de colunas.

### Hooks novos
- `useSuppliers`, `useSupplier(id)`, `useCreateSupplier`, `useUpdateSupplier`.
- `useLocations`, `useLocation(id)`.
- `useRequestActivity(requestId)`.
- Extensão de `useUpdateRequest` para aceitar `supplierId`, `locationId`, `estimatedCost`, `finalCost`.

### Componentes novos
- `SupplierForm`, `SupplierCombobox` (reutilizável em requests/tasks/cleaning).
- `LocationCombobox` (com agrupamento por `kind`).
- `LocationPicker` (para o formulário "onde é o problema": room OU location).
- `CostFields` (card só para admin/manager).
- `RequestActivityFeed`.

### Tipos / mappers
- Atualizar `src/lib/types.ts` com `Supplier`, `Location`, `LocationKind`, campos novos em `Request`/`OpsTask`/`CleaningTask`.
- Estender `src/lib/dataMappers.ts`.

### Não incluído nesta fase (vem depois)
- Contracts module (Fase 2 — depende de Suppliers ✓).
- Document Management (Fase 2).
- Cleaning checklist "create issue from cleaning" (Fase 3 — depende de Locations ✓).
- Insights novos cards (Fase 3 — depende de costs ✓ e activity ✓).
- Resident files, tags VIP, correspondence (Fase 4).
- Stays minimum-duration alert e UX polish global (Fase 5 — quick wins finais).
- Import real de quartos via Excel (Fase 5).

### Critérios de aceitação Fase 1
- Posso criar um supplier, atribuí-lo a um pedido, e ver esse pedido no perfil do supplier.
- Posso criar um pedido apontando para "Cozinha 5º piso" (location não-room).
- Posso definir custo estimado/final num pedido; residente não vê nada disso na UI nem no network tab.
- Cada mudança de owner/supplier/status/custo gera uma linha em `request_activity`.
- Quartos antigos continuam a funcionar exatamente como antes (mesmo `room_id`, mesmas páginas).

