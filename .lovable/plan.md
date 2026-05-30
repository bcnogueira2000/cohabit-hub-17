# Manual de Instruções — Living Colours (PDF para equipa de gestão)

## O que vai ser entregue

1. **Nova conta admin partilhada** para a equipa de gestão (assim ninguém usa a conta pessoal).
2. **Conta demo cliente** já existente (Maria) — só documentada no PDF.
3. **PDF** em português, pronto a enviar por email.

---

## 1. Conta admin partilhada

Crio via backend uma conta com:

- **Email:** `gestao@livingcolours.app`
- **Password:** `Gestao2026!` (forte, fácil de partilhar; recomendo que cada pessoa mude depois para a sua própria via "Esqueci-me da password")
- **Nome:** Equipa Gestão
- **Role:** `admin` (acesso total)
- **Email confirmado:** sim (login imediato)

Se preferires outro email/password, dizes antes de aprovar.

**Recomendação adicional:** o ideal é a curto prazo cada membro da gestão criar a sua própria conta e eu atribuir role `admin` (assim o log de atividade fica por pessoa). Posso fazer isso a seguir se quiseres — para já entrego a partilhada como pediste.

## 2. Conta demo residente (já existe)

- **Email:** `maria.demo@livingcolours.test`
- **Password:** `demo1234`
- Documentada no PDF para mostrarem a vista do residente.

---

## 3. Estrutura do PDF

Documento profissional, ~12-15 páginas, com capa, índice e secções:

**1. Acesso à plataforma**
- URL da app (preview/publicado)
- Como fazer login (conta de gestão + conta demo residente)
- Como criar conta nova (residente vs staff via aprovação)
- Recuperar password
- Login com Google

**2. Visão geral**
- O que é a app, dois portais (Staff vs Residente), papéis (admin / manager / staff / resident)

**3. Portal Staff — página a página**
Para cada uma: o que é, para que serve, workflow típico.
- Dashboard / O Meu Dia
- Pedidos (Requests) — incluindo novo fluxo com **Fornecedor + Responsável Interno**, custos (estimado/final, só admin+manager), atividade
- Limpezas (Cleaning) — hoje, próximas, recorrentes
- Tarefas (Tasks)
- Residentes / Detalhe de residente
- Estadias (Stays)
- Quartos
- **Locais (NOVO)** — espaços partilhados (cozinhas, lavandaria, etc.)
- **Fornecedores (NOVO)** — base de dados de prestadores externos
- Reservas (Bookings)
- Aprovações (registos pendentes)
- Insights
- Utilizadores (só admin)
- Definições

**4. Portal Residente — página a página**
- Home, Os Meus Pedidos, Novo Pedido, Reservas, Perfil, A Minha Estadia

**5. Workflows-chave**
- Como criar um pedido e atribuir fornecedor + responsável interno
- Como registar custo de uma intervenção
- Como agendar uma limpeza
- Como aprovar um novo residente
- Como adicionar um novo fornecedor / local

**6. Boas práticas & FAQ**
- Quem vê o quê (matriz simples de permissões)
- O que residentes nunca veem (custos, fornecedores, notas internas)
- Suporte / a quem pedir ajuda

---

## Detalhes técnicos

- **Geração do PDF:** Python + ReportLab (Platypus, com índice e estilos), guardado em `/mnt/documents/manual-living-colours.pdf`.
- **Layout:** capa com logo, tipografia limpa (Helvetica/Georgia), cor de acento alinhada ao branding atual (lê `index.css` para apanhar o primary HSL), cabeçalho/rodapé com paginação.
- **QA visual obrigatório:** converto cada página para JPEG e inspeciono antes de entregar.
- **Conta admin:** criada via tool `supabase--insert` chamando uma migração curta que insere o user em `auth.users`? Não — para criar utilizador uso uma **edge function** `seed-management-admin` análoga à `seed-demo-admin` existente, OU mais simples: peço-te para clicares uma vez num botão. **Decisão:** crio uma nova edge function `seed-management-admin` (idempotente) e chamo-a uma vez via curl com a tua sessão; ficas com a conta criada e podes voltar a chamar para repor a password se for preciso.

## Não está incluído (posso fazer a seguir se quiseres)

- Capturas de ecrã reais das páginas (PDF fica com descrições escritas; adicionar screenshots é +1 iteração).
- Versão EN.
- Contas individuais por cada membro da gestão (em vez da partilhada).
