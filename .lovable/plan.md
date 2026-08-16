# Hierarquia piso → apartamento → quarto em `locations`

## Diagnóstico confirmado

- 47 quartos, todos no padrão `{piso}{D|E}Q{seq}` — zero exceções.
- Piso 1: 4 (só D) · Piso 2: 12 (5D + 7E) · Piso 3: 12 (5D + 7E) · Piso 4: 7 (só E) · Piso 5: 12 (5D + 7E).
- Apartamentos já existem em `locations` (`Apartamento 1DT`, `2DT`, `2ES`, `3DT`, `3ES`, `4ES`, `5DT`, `5ES`, `4DT (Excluído)`) mas com `kind = 'other'` e sem pai.
- Os 47 `Quarto {número}` também estão soltos (`parent_location_id` nulo).

## O que vai ser feito

### 1. Novos tipos de local
Acrescentar `'apartment'` e `'floor'` ao enum `location_kind`.

### 2. Reclassificar apartamentos
As 9 locations `Apartamento X` passam de `other` para `apartment`. As restantes `other` (lojas, arrumos, lounge, escritório, salas) ficam como estão.

### 3. Criar pisos
Uma location `kind = 'floor'` por cada piso 0 a 6 ("Piso 0" … "Piso 6"), com `floor` preenchido e sem pai (topo da hierarquia).

### 4. Ligar a hierarquia
- Cada apartamento fica com `parent_location_id` = location do seu piso.
- Cada quarto fica com `parent_location_id` = apartamento correspondente, mapeando `D → {piso}DT` e `E → {piso}ES` a partir do número do quarto.
- Todas as outras locations (WCs, cozinhas, corredores, varandas, técnicas, comuns) ficam penduradas: no apartamento quando o código `apartment` corresponde a um apartamento existente, senão diretamente no piso.

### 5. Verificação
Consulta final que confirma: 47 quartos com pai apartamento, 9 apartamentos com pai piso, 7 pisos no topo, e listagem de qualquer location que fique órfã.

## Notas técnicas

- Alteração de enum e ligações de hierarquia numa migração; o preenchimento de `parent_location_id` usa `UPDATE` baseado em `locations.apartment` e no padrão do nome do quarto.
- `Apartamento 4DT (Excluído)` é reclassificado e ligado ao Piso 4, mas não recebe quartos (o piso 4 só tem lado E) — mantém-se apenas como registo do edifício.
- Não há alterações de RLS: `locations` mantém as políticas atuais.
- Sem alterações de frontend neste passo; o `parent_location_id` já existe no schema, pelo que nada quebra. A apresentação em árvore na interface fica para um passo seguinte, se quiseres.
