# Procedimento de Release - ZAP Master

Este documento descreve os passos para gerar e publicar uma nova versão da aplicação.

## 1. Versionamento

O projeto utiliza o **Versionamento Semântico (SemVer)** no formato `MAJOR.MINOR.PATCH`.

- **MAJOR:** Para alterações incompatíveis com a API (breaking changes).
- **MINOR:** Para adicionar funcionalidades de forma retrocompatível.
- **PATCH:** Para correções de bugs retrocompatíveis.

## 2. Checklist Pré-Release

Antes de iniciar o processo de deploy, garanta que todos os seguintes passos foram concluídos:

- [ ] Todas as novas funcionalidades e correções foram submetidas (merged) para a branch `main`.
- [ ] O `CHANGELOG.md` foi atualizado com as alterações da nova versão.
- [ ] O número da versão no `package.json` foi atualizado de acordo com as regras do SemVer.
- [ ] Todos os testes automatizados (unitários, integração) estão a passar na pipeline de CI.
- [ ] O comando `npm run build` é executado com sucesso, sem erros de compilação ou de tipos.
- [ ] As novas variáveis de ambiente (se houver) foram adicionadas ao **Google Secret Manager**.

## 3. Processo de Deploy

A aplicação está hospedada no **Firebase Hosting**. O deploy é automatizado através de **GitHub Actions**.

1.  **Criar uma Tag Git:**
    O processo de deploy para produção é acionado pela criação de uma nova tag no repositório. O nome da tag deve corresponder à versão no `package.json`, prefixado com `v`.
    ```bash
    # Exemplo para a versão 2.1.0
    git tag v2.1.0
    git push origin v2.1.0
    ```
2.  **Pipeline de CI/CD:**
    - Ao fazer o push da tag, uma GitHub Action será acionada.
    - A action irá:
      1. Fazer o checkout do código.
      2. Instalar as dependências (`npm install`).
      3. Executar os testes e o lint (`npm test`, `npm run lint`).
      4. Fazer o build da aplicação (`npm run build`).
      5. Autenticar-se no Firebase usando uma conta de serviço.
      6. Fazer o deploy para o Firebase Hosting (`firebase deploy`).

## 4. Variáveis de Ambiente

Todas as variáveis de ambiente necessárias para a produção estão configuradas no **Google Secret Manager**. O ficheiro `firebase.json` mapeia estes secrets para as variáveis de ambiente que a aplicação espera.

As variáveis essenciais são:
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `ENCRYPTION_KEY`
- `META_VERIFY_TOKEN`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`
- `EMAIL_FROM_ADDRESS`

Para adicionar uma nova variável, é preciso criá-la primeiro no Secret Manager e depois atualizar o `firebase.json`.
