# Menus inferiores iguais no telemóvel

- Manter cinco ícones em ambos os módulos.
- No financeiro, mostrar Contratos, Pagamentos, Custos, Operação e «Mais»; «Mais» abre Preços e Moloni.
- Igualar a altura e o espaço inferior ao menu operacional, sem alterar o menu do computador.
- Verificar os dois menus e a abertura das páginas através de «Mais» num ecrã de telemóvel.

## Detalhes técnicos
- Reutilizar a mesma definição de dimensões nos dois menus para evitar diferenças futuras.

<!-- Previous research retained below for reference.

Não houve escrita nem chamadas à API do Moloni. Nota: o site do Moloni está hoje temporariamente offline ("por motivos de segurança"). Por isso li cópias recentes da documentação oficial em moloni.pt/dev, e algumas listas de campos chegaram incompletas.

## Respostas

1. **Criar fatura de fornecedor**: confirmado. `supplierInvoices/insert` (API v1.13+). Docs: https://www.moloni.pt/dev/documents/supplier-invoices/insert/
   - Obrigatórios confirmados: `company_id`, `date`, `expiration_date`, `document_set_id`, e linhas `products` com IVA em `taxes` (`tax_id`, e `value` quando o imposto é por artigo). Se não houver IVA, `exemption_reason` passa a ser obrigatório por linha.
   - Faltam nomes nas cópias: há mais campos obrigatórios que não aparecem pelo nome. Pela estrutura do `getOne` e do recibo, devem ser `supplier_id` e, por linha, `product_id`, `name`, `qty` e `price`. **Não confirmado.**
   - Opcionais: `notes`, `maturity_date_id` (só afeta o que aparece impresso), descontos, `warehouse_id`.
   - Endpoints que existem: `count`, `getAll`, `getOne`, `insert`, `update`.
2. **Rascunho**: confirmado. `status` = 0 (é o valor por defeito) cria rascunho; 1 cria fechado. Ao fechar, os stocks mexem se o artigo tiver gestão de stock. Diferença face aos documentos de venda: o preço de compra do artigo não é atualizado. A Marta fechar o rascunho na interface do Moloni é o normal, mas **não confirmado** na documentação da API.
3. **Vencimento e Ref.ª do fornecedor**:
   - Vencimento: `expiration_date` (confirmado, obrigatório).
   - Número da fatura original: o `getOne` devolve `your_reference` e `our_reference`. Pela lógica, a Ref.ª Fornecedor é `your_reference`. **Não confirmado** que seja esse o campo que aparece como "Ref.ª Fornecedor".
4. **Fornecedores**: confirmado que existem `suppliers/getByVat` e `suppliers/insert` (https://www.moloni.pt/dev/entities/suppliers/). A ligação ao documento faz-se por `supplier_id` (confirmado no `getOne` e como obrigatório no recibo). Não consegui ler os campos obrigatórios do `suppliers/insert`: **não confirmado**.
5. **Pagamento**: confirmado. `supplierReceipts/insert` (https://www.moloni.pt/dev/documents/supplier-receipts/insert/).
   - Obrigatórios: `company_id`, `date`, `document_set_id`, `supplier_id`, `net_value`, `associated_documents[]` (`associated_id`, `value`) e `payments[]` (`payment_method_id`, `date`, `value`).
   - Também tem rascunho/fechado. Só ao fechar é que concilia as faturas associadas.
   - Para ler o estado: `supplierInvoices/getOne` devolve `net_value` e `reconciled_value`. Em dívida = `net_value` − `reconciled_value` (inferência minha). Também dá para listar com `supplierReceipts/getAll`.
   - Um campo `status` na resposta do `getOne` não apareceu na cópia que li: **não confirmado**. Nos documentos de venda existe.
6. **Anexar o PDF original**: não encontrei nenhum endpoint de anexos na API v1. **Não confirmado / provavelmente não existe.**
7. **Artigos LC2… como linhas**: as linhas aceitam qualquer `product_id` válido. Não encontrei nenhuma regra que exija um tipo especial de artigo para despesas. **Não confirmado.** Atenção: artigos com gestão de stock mexem no stock quando o documento é fechado.
8. **Autenticação**: a v1 usa o mesmo token OAuth para todos os endpoints e não tem "scopes". O que a app já usa (`_shared/moloni.ts`) deve chegar. O limite real são as permissões do utilizador Moloni (MOLONI_USERNAME) dentro da empresa: **confirmar** se pode ver e criar documentos de compra.
9. **Riscos e limitações**:
   - Não há `delete` na lista de endpoints. Um rascunho errado tem de ser corrigido com `update` ou apagado à mão no Moloni. **Não confirmado** se dá para apagar um rascunho pela API.
   - Precisa de uma série (`document_set_id`) válida para compras. A numeração é automática por série; o prefixo "FORN/" não está confirmado.
   - Comunicação à AT: a fatura é do fornecedor, por isso em princípio o Moloni não a comunica. **Não confirmado.**
   - Limites de pedidos: não estão documentados. As listagens trazem no máximo 50 por pedido (`qty`), por isso é preciso paginar.
   - O site do Moloni estar offline hoje mostra que a integração tem de aguentar falhas (repetir mais tarde e guardar no registo).

## Veredicto

**Viável em grande parte.**
- A app consegue criar o fornecedor e a fatura em rascunho, com vencimento e referência.
- A Marta fecha a fatura e regista o pagamento no Moloni.
- A app lê a dívida através de `reconciled_value`, ou lendo os recibos.
- O que fica de fora: anexar o PDF original. Ficaria guardado só na app.

## O que confirmar com o suporte do Moloni

1. Lista completa dos campos obrigatórios de `supplierInvoices/insert` e de `suppliers/insert`.
2. Se `your_reference` é a "Ref.ª Fornecedor" e se tem de ser único.
3. Se o `getOne` devolve `status`. E se `reconciled_value` é o valor pago (com recibo fechado).
4. Se há forma de anexar o PDF da fatura original pela API.
5. Se dá para apagar um rascunho pela API.
6. Que série usar para compras, e se estes documentos são ou não comunicados à AT.
7. Que permissões o utilizador da API precisa para documentos de compra. E se há limites de pedidos.
-->
