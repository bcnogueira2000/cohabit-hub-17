# Fim do período transitório: aplicar sempre no mês seguinte

## Como funciona hoje

A ação em bloco cria um novo escalão de renda com `valid_from` = exatamente a data que escolhes. O cálculo da renda é feito **dia a dia**: cada dia do mês usa o valor em vigor nesse dia.

Consequência com a tua data de exemplo (obras terminam a 15 de novembro):
- Novembro fica **proporcional/misto** (1–14 à renda transitória, 15–30 à renda regular)
- Dezembro em diante fica à renda regular

Ou seja, hoje **não** é o comportamento que descreves — a renda real começa a ser cobrada já a meio de novembro, não a 1 de dezembro.

## O que muda

A data escolhida passa a ser interpretada como "data de fim das obras", e a renda regular passa a aplicar-se **a partir do dia 1 do mês seguinte**, sempre em meses completos:

- Obras terminam 15/11 → renda regular a partir de 01/12
- Obras terminam 30/11 → renda regular a partir de 01/12
- Obras terminam 01/12 → renda regular a partir de 01/01

Nenhum mês fica com renda misturada; o mês em que as obras terminam continua integralmente à renda transitória.

## Alterações no diálogo

- Manter o campo único de data ("Data de fim das obras")
- Mostrar por baixo, de forma explícita: "A renda regular será aplicada a partir de 1 de dezembro de 2026 (novembro fica integralmente à renda transitória)"
- O ecrã de confirmação passa a indicar a data efetiva calculada, não a data introduzida
- O escalão criado (`contract_rent_periods.valid_from`) usa a data efetiva (dia 1 do mês seguinte)

O resto do fluxo mantém-se: `recalculate_rent_charges` por contrato (sem tocar em rendas já pagas), `regular_rent_amount` limpo para NULL, e resumo final de sucessos/falhas.

## Detalhes técnicos

- `src/components/contracts/EndTransitionalRentDialog.tsx`: derivar `effectiveFrom = startOfMonth(addMonths(worksEndDate, 1))` e usar esse valor na inserção do escalão e nos textos de confirmação/preview.
- Sem alterações de base de dados: `compute_rent_for_month` já produz meses completos não proporcionais quando o escalão começa no dia 1.
