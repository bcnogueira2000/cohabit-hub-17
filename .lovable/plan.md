
# Recap, QA e próximos passos (sem novas features grandes)

Concordo contigo: estamos em MVP, faz sentido **estabilizar e testar** antes de empilhar features novas (serviços extra, eventos, faturação). O foco desta sessão é: corrigir o que está partido, dar-te uma conta admin para a tua mãe testar e fazer um recap honesto.

---

## 1. Recap — temos duas apps na mesma codebase

Sim, são **dois portais distintos** no mesmo projeto, separados por papel (role) do utilizador:

### Portal Staff (`/` e subpáginas)
Para quem gere a casa. Acesso para `staff`, `manager`, `admin`.
- Dashboard, O meu dia, Requests, Tasks, Cleaning, Bookings
- Rooms, Residents, Stays, Approvals, Users
- Insights (placeholder), Settings

### Portal Residente (`/app/...`)
Para quem mora na casa. Acesso para `resident`.
- Home, Pedidos (criar/ver/fotos), Reservas de espaços
- A minha estadia, O meu perfil, sino de notificações
- Vários "em breve" (Eventos, Serviços, FAQs, Onboarding)

A separação é feita pelo `ProtectedRoute` + `requireRole`. Faz sentido manter assim — **uma codebase, dois shells**, partilham a base de dados e a autenticação.

---

## 2. Bug confirmado — assign não aparece em "O meu dia"

Lendo `src/pages/MyDay.tsx` (linha 30 e 49-51), o filtro "Só minhas" e a deteção do utilizador atual usam:

```text
myEmailFirstName = user.email.split("@")[0]
m.raw.assignedTo.toLowerCase().includes(myEmailFirstName)
```

Ou seja, está a comparar a **primeira parte do email** com o **texto livre** do campo "Atribuída a". Se atribuíste a tarefa escrevendo "Marco" mas o teu email é `marco.silva@...`, a comparação `"marco".includes("marco.silva")` falha → tarefa não aparece em "Só minhas". Além disso, **mesmo sem o filtro**, a tarefa só aparece em O meu dia se `due_date` for hoje — se atribuíste sem prazo ou com prazo futuro, nunca aparece.

A causa raiz é o problema mais fundo já identificado no plan: **`assigned_to` é texto livre** em vez de referência a um utilizador. Isto invalida filtros, "minhas tarefas", relatórios futuros, etc. Vamos corrigir agora porque é barato e desbloqueia o resto.

### O que vamos fazer
1. **DB**: adicionar colunas novas `assigned_to_user_id uuid` em `ops_tasks`, `cleaning_tasks` e `requests`. Não removemos `assigned_to` (texto) já — fica como fallback para registos antigos.
2. **Frontend**:
   - `NewTaskDialog`, `RequestDetail` e `Tasks` passam a usar **dropdown** com `useStaffUsers()` (já existe) em vez de input de texto.
   - `MyDay` passa a filtrar por `assigned_to_user_id === auth.uid()` quando "Só minhas" está ligado, e mostra **todas** as minhas tarefas pendentes (não só as de hoje) num separador "Atribuídas a mim".
3. Mostrar nome do staff (não email) no card da task.

---

## 3. Conta demo admin para a tua mãe

Vou criar uma edge function `seed-demo-admin` parecida com a `seed-demo-resident` que já temos:

- Email: `sandra.teste@livingcolours.test`
- Password: `demo1234`
- Nome: `Sandra Teste`
- Papel: `admin` (vê tudo, incluindo gestão de utilizadores)
- Email auto-confirmado

Adiciono um botão **"Criar conta demo admin"** em `Settings` (ou ao lado do existente da Maria) que invoca a função. Da próxima vez que a tua mãe quiser testar de zero, basta um clique para repor.

> Nota: se a tua mãe vai ver a app, vale a pena mandares-lhe o link de preview já com o login pré-preenchido por ti, ou apontar para `Auth.tsx`.

---

## 4. Outros pequenos QA wins (incluo nesta sessão se concordas)

Coisas baratas que tornam o MVP mais sólido para teste com utilizadores reais:

- **Tradução do estado na Home do residente**: hoje mostra `in_progress` em vez de "Em curso".
- **Botão "Cancelar pedido" para o residente** (passa o estado para `cancelled`).
- **Validar conflito de bookings** antes de inserir (evita duas reservas no mesmo espaço/hora).
- **Sino de notificações**: mostrar a contagem real de não lidas no badge (já lemos da DB, falta o badge).

Não toco em features novas (eventos, serviços extra, faturação). Esses ficam para depois de testares com a tua mãe.

---

## 5. Revisão honesta — está bom? substitui softwares pagos?

### Pontos fortes
- **Visual coerente** e moderno (gradiente quente, tipografia display, badges consistentes). Mais cuidado que a maior parte dos PMS de coliving que já vi (que normalmente são tabelas Excel-style cinzentas).
- **Fluxos automáticos a funcionar**: pedido → tarefa, check-in → preparação + kit, check-out → inspeção + caução. Isto é exatamente o que ferramentas como Cohabs, Habyt internal tools, ou softwares genéricos tipo Guesty/Hostfully fazem — e tu tens uma versão mais simples e mais à medida.
- **Separação de papéis** com RLS bem feita. Portal residente isolado do staff. Isto é caro de fazer bem e está bem feito.
- **PT/EN** desde o início.
- **Dois portais nativos** (web responsivo) sem precisar de app mobile separada.

### Pontos fracos honestos
- **Texto livre em vários sítios** (assign, location): pra demo passa, pra produção não escala.
- **Insights vazio**: o gestor que paga por isto quer ver KPIs no dia 1. É a página que mais "vende" o produto.
- **Sem faturação** (rendas, depósitos, extras). É o calcanhar de Aquiles vs softwares pagos — a maior parte dos PMS justifica o preço por aí. Sem isto, é um "operations tool", não um PMS completo.
- **Sem comunicação em massa** (anúncios, avisos de obra, etc).
- **Sem importação** de dados — começar com 50 residentes obriga a inserir um a um.
- **"Em breve" demasiado visível** no portal residente (Eventos, Serviços, FAQs, Onboarding). Reduz confiança no produto.

### Substitui softwares pagos?
**Honestamente: hoje, não substitui um Cohabs/Habyt internal stack ou um Guesty.** Substitui sim:
- Uma combinação de **Notion + Google Forms + WhatsApp + Excel** que muitos colivings pequenos (até ~50 quartos) usam.
- Um **Trello/ClickUp** para a equipa operacional.
- Um **formulário público de pedidos** de um site WordPress.

Para um coliving pequeno/médio (1-3 casas, até ~80 quartos) isto **já é um upgrade enorme** vs o que costumam ter, especialmente porque é à medida e o residente tem portal próprio (raro nessa gama). Para escalar para 500+ quartos com faturação automática, falta a camada financeira e analytics.

Resumindo: **óptimo MVP para testar com 1 casa real**, e a base técnica está sólida para crescer sem reescrever.

---

## 6. Plano de execução (1 sessão)

```text
1. DB migration:
   - add column assigned_to_user_id uuid em ops_tasks, cleaning_tasks, requests
2. Frontend assign:
   - NewTaskDialog → Select de staff
   - RequestDetail → Select de staff
   - Tasks card mostra nome do staff
3. MyDay:
   - filtro "Só minhas" usa assigned_to_user_id === auth.uid()
   - novo separador / secção "Atribuídas a mim" sem filtro de data
4. Edge function seed-demo-admin + botão em Settings
5. Quick QA wins:
   - traduzir status na Home residente
   - botão cancelar pedido (residente)
   - validar overlap nos bookings
   - badge real no sino
```

---

## 7. Detalhes técnicos

- Migração SQL adiciona colunas nullable (não parte dados existentes). RLS permanece igual (`is_staff` continua a controlar acesso).
- `useStaffUsers` já existe e retorna `{user_id, full_name, email, role}`. Reutiliza-se.
- `seed-demo-admin` segue o padrão de `seed-demo-resident` mas insere role `admin` e não cria registo em `residents`.
- `MyDay` deixa de usar `myEmailFirstName` heurístico — passa a usar `user.id`.
- Para o badge do sino, o hook `useNotifications` já devolve as notificações com `read_at`; basta contar `read_at === null` em `NotificationBell`.

Confirmas? Ou queres tirar/acrescentar algum item antes de avançar?
