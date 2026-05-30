# Atualizar manual com capítulo de orientação ao teste

Adicionar um novo capítulo ao PDF `manual-living-colours.pdf` focado em ajudar a equipa de gestão a testar a app de forma estruturada e a dar feedback útil.

## Onde entra no documento

Novo capítulo **"7. Como testar e dar feedback"**, inserido antes do atual "Boas práticas & FAQ" (que passa a 8). Aparece também no índice.

## Conteúdo do novo capítulo (~2 páginas)

**7.1 Objetivo do teste**
- Não é só verificar se funciona — é avaliar se os fluxos fazem sentido no dia-a-dia da Living Colours, o que falta, o que sobra, e o que pode ser simplificado.

**7.2 Como abordar o teste (sugestão de ordem)**
1. Entrar com a conta de gestão e explorar o portal staff sem agenda — primeira impressão.
2. Entrar com a conta `maria.demo` (residente) noutro browser/janela anónima e perceber a vista do cliente.
3. Executar os workflows-chave (lista abaixo) de ponta a ponta, alternando entre as duas contas quando faz sentido (ex.: residente cria pedido → gestão resolve).

**7.3 Workflows a testar (checklist)**
Lista curta e accionável, cada um com "o que fazer" + "o que avaliar":
- Criar pedido como residente, atribuir fornecedor + responsável interno como staff, registar custo, fechar.
- Agendar uma limpeza pontual e uma recorrente; verificar no Dashboard e em Limpezas.
- Criar uma tarefa interna e marcar como concluída.
- Aprovar um novo residente em Aprovações.
- Adicionar um fornecedor novo e um local novo (área comum).
- Criar uma reserva de espaço comum (se aplicável).
- Convidar/promover um utilizador em Utilizadores (só admin).

**7.4 O que queremos que avaliem (eixos de feedback)**
- **Clareza**: percebe-se o que cada página faz sem explicação?
- **Fluxo**: o nº de cliques para tarefas frequentes é razoável?
- **Linguagem**: termos (pedido, estadia, local, fornecedor) batem com o vocabulário interno?
- **Falta algo**: campos, filtros, notificações, relatórios?
- **Sobra algo**: páginas/campos que nunca usariam?
- **Permissões**: alguém vê algo que não devia, ou não vê algo que precisa?
- **Mobile**: experiência no telemóvel (a app é responsive).

**7.5 Como enviar feedback**
- Formato sugerido por item: *página/fluxo · o que aconteceu · o que esperavam · sugestão*.
- Canal: email para [a definir contigo] ou folha partilhada (placeholder no PDF).
- Para bugs: incluir screenshot e passos para reproduzir.

**7.6 Avisos importantes durante o teste**
- Os dados criados durante o teste ficam no sistema — usar prefixo "TESTE -" em títulos para facilitar limpeza depois.
- A conta de gestão é partilhada: não mudar a password sem combinar.
- A conta `maria.demo` também é partilhada — não apagar a estadia/quarto associados.

## Execução técnica

- Reabrir o script Python que gerou o PDF original (ou reescrever, mantendo o mesmo estilo Platypus/ReportLab, capa, índice, paginação e cor de acento já alinhada ao branding).
- Inserir o novo capítulo, renumerar o seguinte, regenerar o índice.
- Guardar como `manual-living-colours.pdf` (substitui o atual; se preferires versionar digo e crio `_v2`).
- QA visual obrigatório: converter cada página para JPEG e inspecionar antes de entregar.

## Fora de âmbito (posso fazer a seguir se quiseres)

- Criar um formulário online de feedback (Google Form ou página dentro da própria app).
- Versão EN do manual.
- Screenshots reais nas páginas.
