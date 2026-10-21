# Custos — passo 2

## Ecrãs e fluxo
- Acrescentar Custos ao financeiro para equipa, gestão e administração, mantendo as restantes áreas financeiras restritas.
- Lista mensal com filtros, indicadores e resumo por grupo, fornecedor e local. Separar sempre Operação, Investimentos e Stocks.
- Carregamento múltiplo e fotografia: guardar primeiro o original privado e o rascunho, detetar ficheiros repetidos por SHA-256 e depois ler QR/IA sem bloquear o preenchimento manual.
- Detalhe com pré-visualização, fornecedor, linhas/IVA/local, avisos de divergência e duplicados, rascunho, classificação, pagamento e histórico.
- Reutilizar os seletores, formulário de fornecedor e sino existentes.

## Segurança e execução
- Reutilizar permissões e histórico do passo 1; guardar cabeçalho e linhas numa operação atómica validada no servidor.
- Leitura com Lovable AI autenticada, apenas para equipa e ficheiros do bucket de Custos; erros preservam sempre o rascunho.
- Avisos diários de vencimento, idempotentes por fatura/tipo, usando as notificações existentes. Sem emails ou Moloni.

## Validação
- Testes do QR AT, NIF HJCC 516245910, IVA e separação dos totais.
- Verificar carregamento, classificação, duplicados, pagamento e reabertura com sessão autorizada, incluindo apresentação em telemóvel.

## Decisões técnicas
- QR AT usa `*` como separador, conforme o primeiro exemplo do pedido.
- Mês por data da fatura; rascunhos sem data usam a data de receção. Totais agrupados pelas linhas classificadas; valores sem categoria ficam por classificar.
- PDF é renderizado no browser para leitura QR; a IA recebe imagens do documento. Avisos executados uma vez por dia (atraso máximo até 24 horas).
