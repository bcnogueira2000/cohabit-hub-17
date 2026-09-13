# Upload direto de documentos da candidatura

## Objetivo
Evitar que ficheiros grandes passem pela função intermédia e esgotem memória, mantendo o acesso protegido pelo token da candidatura.

## Alterações
- Substituir a função atual por uma operação leve que valida o token, cria um caminho exclusivo da lead e devolve um URL temporário de upload para o bucket privado `lead-documents`.
- Depois do upload, validar novamente o token e o caminho e registar apenas os metadados em `lead_documents`.
- Atualizar o formulário para enviar cada ficheiro diretamente ao armazenamento através do URL temporário, sem Base64.
- Limitar cada ficheiro a 10 MB antes de o adicionar, mostrando uma mensagem clara em português ou inglês.
- Preservar os formatos aceites, a obrigatoriedade de pelo menos um documento e o restante fluxo de submissão.

## Segurança e validação
- O caminho será sempre criado no diretório da lead associada ao token e não poderá ser escolhido livremente pelo candidato.
- O registo só aceitará caminhos pertencentes à mesma lead e confirmará que o ficheiro já existe no armazenamento.
- O URL de upload será temporário, de utilização limitada, e o bucket continuará privado.

## Verificação
- Testar um ficheiro válido através do novo upload direto e confirmar o registo em `lead_documents`.
- Confirmar que um ficheiro superior a 10 MB é bloqueado no formulário com mensagem clara.
- Confirmar que tokens inválidos e caminhos de outra lead são rejeitados.
