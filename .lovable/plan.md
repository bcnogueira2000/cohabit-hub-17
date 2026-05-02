## Promover utilizadores existentes a admin

### Diagnóstico
A tua conta `bcnogueira2000@gmail.com` foi criada antes da Fase 1. Não tem entrada em `profiles` nem em `user_roles`, por isso o sistema considera-te "não-staff" e bloqueia tudo.

Soluções a aplicar em conjunto:

### 1. Migração de backfill + promoção a admin
Uma única migração SQL que:

- **Cria profiles em falta** para todos os utilizadores existentes em `auth.users` (com `account_status = 'active'` para não te enviar para o ecrã de "pending approval").
- **Promove `bcnogueira2000@gmail.com` a `admin`** inserindo em `user_roles`.
- (Opcional) Backfill: se algum desses utilizadores tiver email correspondente a um `residents`, faz o auto-link e dá role `resident`.

### 2. Página de gestão de utilizadores e roles (`/users`)
Para que no futuro consigas promover/despromover sem mexer em SQL:

- Nova rota `/users` (acessível só a `admin`).
- Lista todos os profiles com email, nome, status, roles atribuídas.
- Botões para atribuir/remover roles: `resident`, `staff`, `manager`, `admin`.
- Item "Utilizadores" no sidebar (só visível para admins).

### 3. Edge function `set-user-role`
Para alterar roles de forma segura:
- Verifica via `getClaims` que o caller tem role `admin`.
- Usa service role para inserir/remover em `user_roles`.
- Evita que um admin se remova a si próprio (impede ficar sem admins).

### Como vai correr
1. Migração roda → ficas imediatamente com role `admin`, profile activo.
2. Recarregas a app, fazes login → entras no dashboard de staff normal.
3. Vais a `/users` para gerir roles dos restantes utilizadores (incluindo a tua conta demo `maria.demo` que continua como `resident`).

### Ficheiros
- **Migração SQL** (backfill profiles + promoção a admin)
- **Criar:** `supabase/functions/set-user-role/index.ts`
- **Criar:** `src/pages/Users.tsx`, `src/hooks/useUsers.ts`
- **Editar:** `src/App.tsx` (rota), `src/components/layout/AppShell.tsx` (item sidebar para admins)
