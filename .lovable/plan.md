## Conta demo de residente

Criar uma conta demo permanente para testares o portal do residente sem precisares de passar pelo fluxo de aprovação.

### Credenciais
- **Email:** `maria.demo@livingcolours.test`
- **Password:** `demo1234`
- **Quarto:** será associada a um quarto existente (ou criado se necessário)

### Implementação

1. **Edge function `seed-demo-resident`** (`supabase/functions/seed-demo-resident/index.ts`)
   - Usa o `SUPABASE_SERVICE_ROLE_KEY` para contornar RLS e criar/repor o utilizador.
   - Lógica idempotente:
     1. Procura o user `maria.demo@livingcolours.test` em `auth.users`. Se não existir, cria-o com `email_confirm: true` e a password `demo1234`.
     2. Garante um registo em `residents` com esse email, ligado ao `user_id` e com `status = 'active'`, `move_in` há 30 dias, `move_out` daqui a 6 meses, e um `room_id` (escolhe o primeiro quarto disponível ou mantém o atual).
     3. Garante o registo em `profiles` com `account_status = 'active'` e `resident_id` correto.
     4. Garante a role `resident` em `user_roles`.
   - Restrição de acesso: só executa se quem chama for staff (`is_staff(auth.uid())`) — para evitar abuso.

2. **Botão "Repor conta demo" na página `/approvals`**
   - Adicionar um botão no topo da página Approvals que invoca a edge function.
   - Ao concluir, mostra toast com as credenciais (email + password) para copiares.

3. **Config**
   - `supabase/functions/seed-demo-resident/.config.toml` não é necessário — `verify_jwt = false` por defeito; validamos o JWT no código com `getClaims()` para garantir que só staff repõe.

### Como testar depois
1. Login como admin → ir a `/approvals` → clicar **"Repor conta demo"**.
2. Logout → login com `maria.demo@livingcolours.test` / `demo1234` → és redirecionada para `/app/home` (portal mobile do residente).
3. Podes voltar a clicar no botão a qualquer momento para repor o estado da conta.

### Ficheiros
- **Criar:** `supabase/functions/seed-demo-resident/index.ts`
- **Editar:** `src/pages/Approvals.tsx` (adicionar botão + handler)
