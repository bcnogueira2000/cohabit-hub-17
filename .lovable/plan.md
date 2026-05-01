
## Diagnóstico

Investiguei a BD e confirmei duas coisas:

**1. Os automatismos NÃO estão ativos.**
As funções `auto_create_from_request` e `auto_create_checkout_tasks` existem, mas **nunca foram ligadas às tabelas** via `CREATE TRIGGER`. Resultado: criar um pedido ou marcar um residente como `checking_out` não dispara nada. Mesmo os geradores de código (`REQ-001`, `T-001`) e o `updated_at` automático estão desligados.

**2. Falta o fluxo de entrada de residentes.**
Hoje, `residents` é uma tabela isolada — só lá entra quem for inserido manualmente. Não há ligação entre uma reserva (booking de quarto / contrato) e a criação do residente. Por isso o sistema não tem como reagir a entradas para gerar limpezas de check-in, kits de boas-vindas, etc.

A tabela `bookings` que existe hoje serve apenas para **reservas de espaços comuns** (sala de coworking, etc.), não para reservas de quarto / contratos de estadia. São coisas diferentes.

---

## Plano

### Etapa 1 — Ativar todos os triggers em falta

Migration que cria os `CREATE TRIGGER` para as funções já existentes:

```text
requests       BEFORE INSERT  → gen_request_code
requests       BEFORE UPDATE  → set_updated_at
requests       AFTER  INSERT  → auto_create_from_request
ops_tasks      BEFORE INSERT  → gen_ops_task_code
ops_tasks      BEFORE UPDATE  → set_updated_at
cleaning_tasks BEFORE UPDATE  → set_updated_at
residents      BEFORE UPDATE  → set_updated_at
residents      AFTER INSERT/UPDATE OF status → auto_create_checkout_tasks
rooms          BEFORE UPDATE  → set_updated_at
```

Depois disto, cada novo pedido cria automaticamente a `ops_task` ou `cleaning_task` correspondente, e marcar um residente como `checking_out` gera inspeção + devolução de caução.

### Etapa 2 — Modelo de entrada de residentes (stays)

Criar um conceito novo, separado dos `bookings` de espaços:

**Nova tabela `stays`** (contratos de estadia / reservas de quarto):
```text
id, resident_id (nullable até confirmar), full_name, email, phone,
room_id, check_in, check_out, status (pending|confirmed|checked_in|checked_out|cancelled),
source (manual|public_form|external), notes, created_at, updated_at
```

**Fluxo proposto:**

```text
1. Estadia criada (manual ou formulário) → status=pending|confirmed
2. Quando check_in se aproxima (D-1) ou status muda para checked_in:
   ├─ cria/atualiza `resident` (status=upcoming → active)
   ├─ atualiza `room.status` = reserved/occupied
   ├─ cria `cleaning_task` (room_regular, service=normal) agendada para D-1
   └─ cria `ops_task` "Kit boas-vindas — <nome>" agendada para D-0
3. Quando check_out se aproxima (D-1) ou status muda para checked_out:
   ├─ marca `resident.status` = checking_out
   │   (e isso já dispara o trigger Etapa 1: inspeção + caução)
   └─ liberta `room.status` = cleaning_required
```

Tudo isto via **3 triggers novos** em `stays`:
- `trg_stay_checkin_prep` (BEFORE check_in date OR status=checked_in)
- `trg_stay_checkout_prep` (status=checked_out)
- `trg_stay_sync_resident` (mantém `residents` em sincronia)

### Etapa 3 — Interface de gestão de stays

**Página nova `/stays`** (Estadias / Reservas de quarto):
- Lista cronológica com filtros: A chegar / Em casa / A sair / Histórico
- Botão "Nova estadia" → form (nome, email, telefone, quarto, datas, fonte)
- Detalhe da estadia mostra timeline: estadia criada → kit agendado → limpeza agendada → check-in → check-out → caução devolvida
- Ações rápidas: "Confirmar check-in", "Marcar como saído"

**Renomear o atual `/bookings` para `/spaces-bookings`** (ou apenas no rótulo da nav: "Reservas de espaços") para deixar claro que é só para sala comum / coworking.

**Formulário público `/book-room`** (opcional, próxima iteração): permite preencher uma estadia diretamente que entra como `status=pending` na lista de gestão para o admin confirmar.

### Etapa 4 — Dashboard: secção "Próximas entradas/saídas"

Card no dashboard com:
- Próximas 3 chegadas (próximos 7 dias) com estado das tarefas associadas (limpeza ✓ / kit ✓)
- Próximas 3 saídas com estado da inspeção e caução

---

## Detalhes técnicos

**Ficheiros novos:**
- `supabase/migrations/<ts>_attach_triggers.sql` — Etapa 1
- `supabase/migrations/<ts>_create_stays.sql` — tabela + enum + triggers + RLS
- `src/pages/Stays.tsx`, `src/pages/StayDetail.tsx`
- Hooks `useStays`, `useCreateStay`, `useUpdateStay` em `useData.ts`
- Atualização de `dataMappers.ts` e `types.ts`

**Triggers Etapa 2 (Postgres):**
```sql
-- ao criar/confirmar stay
CREATE FUNCTION stay_prepare_checkin() ... cria cleaning_task + ops_task kit
CREATE FUNCTION stay_sync_resident() ... upsert em residents
CREATE FUNCTION stay_handle_checkout() ... marca resident=checking_out
```

**RLS:** mesmas políticas das outras tabelas (`authenticated` lê e escreve).

**Sem alterações destrutivas:** os `bookings` atuais ficam intocados (só uma label diferente na nav).

---

## Fora do âmbito desta etapa

- Integração com Booking.com / Airbnb (próxima iteração — exigiria edge function + webhook)
- Pagamentos / faturação
- Assinatura digital de contrato

Aprovas para avançar com as 4 etapas?
