
# Opinião honesta sobre o UX/UI atual

A app já está num bom ponto: identidade de marca aplicada (teal Living Colours, Source Sans), estrutura sólida (sidebar desktop + bottom nav mobile, portal de residente separado, KPIs no dashboard), e os fundamentos estão lá. **Não está mau — está "quase profissional", mas com um conjunto de detalhes que a fazem parecer um MVP em vez de produto acabado.**

Aqui está a crítica honesta, organizada por prioridade.

## O que está a funcionar bem
- Hierarquia clara: dashboard → KPIs → cartões de detalhe
- Portal de residente bem separado do staff, com bottom nav adequado
- Tokens semânticos (HSL) bem montados — fácil iterar
- Logo + paleta da marca aplicados de forma consistente

## Problemas concretos que tiram profissionalismo

### 1. Inconsistência de idioma (o mais visível)
Na sidebar coexistem **"Dashboard", "Requests", "Cleaning", "Tasks", "Residents", "Rooms"** (EN) com **"O meu dia", "Estadias", "Aprovações", "Reservas espaços", "Utilizadores"** (PT). Parece feito por duas pessoas diferentes. Decidir: tudo PT (recomendado, dado o público) ou tudo EN.

### 2. Densidade e respiração
- Cards com `p-4`/`p-5` e títulos `text-xl` ficam apertados. Apps profissionais (Linear, Notion, Stripe) usam mais respiração e títulos mais discretos.
- O título "Bom dia, pedro." tem `text-3xl/4xl` — demasiado grande, e o `firstName` vem do email (`pedro` em minúscula sem capitalize correto).
- KPI numbers em `text-3xl` com label em `uppercase tracking-wide` — visualmente OK mas o contraste tipográfico pode ser mais subtil.

### 3. Botões e CTAs
- `rounded-full` em todos os botões é uma escolha forte mas usada em excesso (auth, dashboard, formulários). Apps SaaS sérias preferem `rounded-md`/`rounded-lg`. O pill-shape funciona em landing pages, não em ferramentas operacionais densas.
- O `gradient-warm` (teal→teal claro) no CTA principal é simpático mas fica saturado em todo lado. Melhor: primary sólido, gradient apenas em hero/auth.

### 4. Cartões "flutuantes" sem hierarquia clara
Todos os cards têm `shadow-card` + `border-border/60`. Em apps profissionais, ou se usa **só border** (estilo Linear/Vercel) ou **só shadow suave** (estilo Stripe), não ambos competindo. Atualmente mistura os dois sinais.

### 5. Estados vazios pobres
"Sem pedidos abertos. ✨", "Sem limpezas agendadas." — texto centrado, sem ícone, sem CTA. Empty states profissionais têm ícone, frase, e ação ("Criar primeiro pedido").

### 6. Bottom nav mobile mistura PT/EN
"Hoje, Requests, Cleaning, Tasks, More" — mesmo problema do ponto 1, agravado pelo espaço apertado.

### 7. Auth screen
Boa em geral, mas o "Operations" em uppercase tracking parece corporativo demais para um coliving (que é a tua marca: comunidade, calor, cores). Tom não bate certo com a identidade.

### 8. Faltam micro-detalhes que distinguem produtos
- Sem **avatares** dos residentes (só nome em texto) — uma app de gestão de pessoas devia mostrar caras
- Sem **skeleton loaders** — quando os dados carregam, vês "0" antes do número real, parece bug
- Sem **tooltips** em ícones-only (botão de seta para "Ver estadias")
- Datas formatadas inconsistentemente entre páginas

### 9. Sidebar desktop
12+ items lineares sem agrupamento. Linear/Notion agrupam: **Operações** (Requests, Cleaning, Tasks), **Pessoas** (Residents, Stays, Approvals), **Espaços** (Rooms, Bookings), **Insights & Settings**. Reduz carga cognitiva.

## Plano de melhorias

### Fase 1 — Consistência (impacto alto, esforço baixo)
1. **Unificar idioma para PT** em toda a navegação e labels:
   - Sidebar: Dashboard → "Painel", Requests → "Pedidos", Cleaning → "Limpezas", Tasks → "Tarefas", Residents → "Residentes", Rooms → "Quartos"
   - Bottom nav: "Hoje, Pedidos, Limpezas, Tarefas, Mais"
2. **Capitalizar `firstName`** corretamente no greeting (evitar "pedro" minúsculo do email — usar `profile.full_name` quando exista, fallback para email com capitalize).
3. **Tirar "Operations"** do logo no Auth e sidebar. Só "Living Colours" basta.

### Fase 2 — Refinamento visual (impacto alto, esforço médio)
4. **Reduzir `rounded-full`** apenas a: badges, avatares, e um único CTA primário no header. Resto vai para `rounded-lg`.
5. **Substituir `gradient-warm`** por primary sólido em botões; manter gradient apenas no Auth e em 1 hero card do dashboard.
6. **Cards: escolher um sinal de elevação** — recomendo manter `border` e remover `shadow-card` excepto em cards interativos (hover state). Mais limpo, mais "Linear/Vercel".
7. **Reduzir tamanhos de título**: H1 do dashboard de `text-4xl` → `text-2xl`. Títulos de card de `text-xl` → `text-base font-semibold`.
8. **Empty states ricos**: componente `<EmptyState icon title description action />` reutilizável, usado em todas as listas.

### Fase 3 — Estrutura (impacto médio, esforço médio)
9. **Agrupar sidebar** com section labels (uppercase, micro):
   ```
   PRINCIPAL    Painel · O meu dia
   OPERAÇÕES    Pedidos · Limpezas · Tarefas
   PESSOAS      Residentes · Estadias · Aprovações
   ESPAÇOS      Quartos · Reservas
   SISTEMA      Insights · Definições · Utilizadores
   ```
10. **Skeleton loaders** nos KPIs e listas do dashboard (componente `<Skeleton />` já existe em ui/).
11. **Avatares** (iniciais coloridas com `brand-lilac/yellow/coral` rotacionando) ao lado de nomes de residentes nas listas.

### Fase 4 — Polish (impacto médio, esforço baixo)
12. **Tooltips** em todos os botões icon-only.
13. **Formato de data único** em toda a app: helper `formatDate(date, "short" | "long")` em `lib/utils.ts`.
14. **Auth**: substituir "Operations" subtítulo por algo mais quente em PT/EN ("Bem-vindo a casa" / "Welcome home") ou simplesmente remover.

## Detalhes técnicos

Ficheiros principais a tocar:
- `src/components/layout/AppShell.tsx` — labels PT, agrupamento de sidebar
- `src/index.css` / `tailwind.config.ts` — sem mudanças nos tokens, apenas usar mais brand accents (lilac/yellow/coral) em avatares
- `src/pages/Dashboard.tsx` — tamanhos de título, empty states, skeletons, capitalize firstName
- `src/pages/Auth.tsx` — remover "Operations", suavizar pill buttons
- Novo: `src/components/ui/EmptyState.tsx`, `src/components/ui/Avatar.tsx` (wrapper sobre o existente com cores da marca)
- `src/lib/utils.ts` — helpers `formatDate`, `getInitials`, `capitalize`

Sem mudanças à estrutura de dados, sem mudanças de auth/RLS, sem migrations. É puramente camada de apresentação.

## Pergunta antes de avançar

Queres que execute **todas as fases (1–4)** ou prefere fazer só **Fase 1 + 2** primeiro (consistência + refinamento visual) e ver o resultado antes de continuar? A Fase 1+2 já cobre 70% do salto de "MVP" para "profissional".
