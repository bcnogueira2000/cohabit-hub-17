## Problemas identificados

### 1. Erro `duplicate key requests_code_key` ao submeter pedido
A tabela `requests` tem **triggers duplicados**:
- `trg_requests_code` + `trg_requests_gen_code` → ambos chamam `gen_request_code()`
- `trg_request_automation` + `trg_requests_auto_create` → ambos chamam `auto_create_from_request()` (cria tarefas duplicadas em `ops_tasks` / `cleaning_tasks`)

Além disso, a função `gen_request_code()` usa `MAX(...)+1` numa subquery, que é vulnerável a race conditions e a estados inconsistentes. Solução: substituir por uma **sequência Postgres dedicada** (`requests_code_seq`), que garante unicidade atómica.

### 2. Seleção de quarto no formulário de pedido
Sim — o sistema **já associa automaticamente** o quarto do residente autenticado (lê `residents.room_id` via `current_resident_id()`). O campo "Localização" é texto livre apenas para detalhar onde (casa de banho, cozinha comum, lavandaria, etc).

Problemas atuais:
- O texto auxiliar "Por defeito é o teu quarto" é ambíguo — parece sugerir que a localização **é** o quarto, quando na verdade só serve para indicar áreas comuns ou específicas.
- Se o residente ainda **não tiver `room_id`** associado (conta nova, sem aprovação), o pedido é criado sem quarto, o que pode dificultar o trabalho da equipa.

---

## Plano de correção

### A. Migração SQL
1. **Eliminar triggers duplicados** em `requests`:
   - `DROP TRIGGER IF EXISTS trg_requests_gen_code` (manter `trg_requests_code`)
   - `DROP TRIGGER IF EXISTS trg_requests_auto_create` (manter `trg_request_automation`)
   - Mesma limpeza para `trg_requests_updated_at` (duplicado de `trg_requests_upd`)
2. **Limpar tarefas órfãs** geradas em duplicado por `auto_create_from_request` (one-shot DELETE de duplicados em `ops_tasks` e `cleaning_tasks` cujo `request_id`/`source_ref` aponta para o mesmo pedido).
3. **Substituir `gen_request_code()`** por versão baseada em `CREATE SEQUENCE requests_code_seq` com `setval` ao valor atual máximo + 1, e gerar `REQ-` || `lpad(nextval(...), 3, '0')`. Aplicar o mesmo padrão a `gen_ops_task_code()` (verificar duplicação também).

### B. Pequenas melhorias no formulário (`RequestNew.tsx`)
1. Renomear o campo "Localização" para algo como **"Onde?"** com placeholder claro: *"Casa de banho, cozinha, lavandaria…"*.
2. Mostrar o quarto associado em modo leitura (chip pequeno: "Quarto 203" ou "Sem quarto atribuído"), para o residente perceber o que está a acontecer.
3. Se o residente não tiver `room_id`, deixar passar mas avisar discretamente: *"Ainda não tens quarto atribuído — a equipa irá tratar disso."*

### C. Hook `useResidentRequests.ts`
- Em vez de mandar `code: ""`, **omitir `code`** do payload (deixar o trigger gerar). Isto evita ambiguidade.
- Buscar o `resident` filtrado pelo utilizador autenticado (`user_id = auth.uid()`) em vez de `.limit(1)`, para garantir robustez.

### Arquivos afetados
- nova migração SQL (sequência + drop dos triggers duplicados + limpeza de duplicados)
- `src/hooks/useResidentRequests.ts`
- `src/pages/resident/RequestNew.tsx`

### Resultado esperado
- Submeter pedido funciona sem erro.
- Cada pedido gera **uma única** tarefa para a equipa (não duas).
- O residente vê claramente que o quarto está auto-associado, e o que significa o campo "Onde?".
