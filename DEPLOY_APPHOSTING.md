# Guia de Implantação com Firebase App Hosting

Este guia detalha o processo passo a passo para configurar e implantar uma aplicação web (com foco em Next.js) no Firebase App Hosting, utilizando a integração contínua (CI/CD) com o GitHub.

## Pré-requisitos

Antes de começar, garanta que você tenha:

1.  **Um Projeto Firebase:** [Crie um projeto no console do Firebase](https://console.firebase.google.com/).
2.  **Firebase CLI:** A ferramenta de linha de comando do Firebase instalada e atualizada.
    ```bash
    npm install -g firebase-tools
    ```
3.  **Autenticação:** Faça login na sua conta do Google através do CLI.
    ```bash
    firebase login
    ```
4.  **Código no GitHub:** Seu projeto precisa estar em um repositório no GitHub para usar o deploy contínuo.

---

## Passo 1: Inicializando o App Hosting no Projeto

O primeiro passo é usar o fluxo de inicialização interativo para conectar seu projeto Firebase ao seu repositório do GitHub.

1.  **Execute o comando de inicialização:**
    No diretório raiz do seu projeto, execute:
    ```bash
    firebase init apphosting
    ```

2.  **Siga o fluxo interativo:**
    O CLI fará uma série de perguntas para configurar a integração:
    *   **Conta do GitHub:** Selecione a conta do GitHub onde seu repositório está localizado. Se for a primeira vez, você será redirecionado para instalar o App do Firebase App Hosting no GitHub.
    *   **Repositório:** Escolha o repositório da sua aplicação.
    *   **Diretório Raiz:** Especifique o diretório raiz da sua aplicação (geralmente `/`).
    *   **Branch de Deploy Contínuo:** Selecione a branch que acionará os deploys automáticos (ex: `main`, `master`, `feature/mvp`).
    *   **Nome do Backend:** Dê um nome para o seu backend (ex: `my-web-app`). Este nome será usado internamente no Firebase.

Ao final, o CLI confirmará a criação do backend e iniciará o primeiro deploy.

---

## Passo 2: Configurando o `apphosting.yaml`

O arquivo `apphosting.yaml` define a configuração do seu servidor de produção. Ele é criado automaticamente, mas você pode personalizá-lo conforme necessário.

**Exemplo de `apphosting.yaml`:**
```yaml
# Define os recursos e o comportamento do servidor de produção.
run:
  # Aloca 1 vCPU para o servidor.
  cpu: 1
  # Aloca 1024 MiB de memória.
  memoryMiB: 1024
  # Permite que o servidor lide com até 100 requisições simultâneas.
  concurrency: 100
  # Aumenta o tempo limite para requisições para 120 segundos.
  timeoutSeconds: 120

# Configura as verificações de saúde para o Next.js
healthChecks:
  livenessProbe:
    httpGet:
      path: "/_ah/live"
  readinessProbe:
    httpGet:
      path: "/_ah/ready"
```

---

## Passo 3: Gerenciando Secrets (Variáveis de Ambiente)

Sua aplicação provavelmente precisa de chaves de API, URLs de banco de dados e outras informações sensíveis. O App Hosting gerencia isso através do **Google Secret Manager**.

1.  **Defina os Secrets no `firebase.json`:**
    Liste todas as variáveis de ambiente necessárias na seção `apphosting` (ou `frameworksBackend`) do seu `firebase.json`. O nome do `secret` deve corresponder ao nome que você criará no Secret Manager.

    ```json
    {
      "apphosting": {
        "backends": ["my-web-app"],
        "secretEnv": [
          {
            "key": "DATABASE_URL",
            "secret": "database-url"
          },
          {
            "key": "JWT_SECRET_KEY",
            "secret": "jwt-secret-key"
          }
        ]
      }
    }
    ```

2.  **Crie os Secrets no Google Secret Manager:**
    Para cada `secret` definido, você precisa criar a entrada correspondente no Secret Manager.

    ```bash
    # Substitua SECRET_NAME pelo nome do seu secret (ex: "database-url")
    # O comando pedirá que você insira o valor do secret.
    gcloud secrets create SECRET_NAME --data-file=-
    ```

3.  **Conceda Permissão de Acesso:**
    O serviço do App Hosting precisa de permissão para ler os secrets que você criou. Conceda a permissão `Secret Accessor` para cada um deles.

    ```bash
    # Substitua PROJECT_NUMBER pelo número do seu projeto GCP.
    # Você pode encontrá-lo no console do Google Cloud.
    gcloud secrets add-iam-policy-binding SECRET_NAME \
      --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-firebasessp.iam.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
    ```

> **Atenção:** A falha em criar ou dar permissão a um secret é a causa mais comum para o erro **"Failed to publish app"**.

---

## Passo 4: Realizando o Deploy

Existem duas maneiras de implantar sua aplicação:

### A. Deploy Automático (CI/CD)

Se você configurou uma branch de deploy contínuo no Passo 1, basta fazer um `git push` para essa branch. O App Hosting detectará a mudança, iniciará um novo build e implantará a nova versão automaticamente.

```bash
git push origin feature/mvp
```

### B. Deploy Manual

Para forçar um deploy manualmente a partir da sua máquina local, use o comando:
```bash
firebase deploy --only apphosting
```
Isso é útil para deploys que não estão atrelados a um push no Git.

---

## Passo 5: Monitorando o Deploy

Você pode acompanhar o progresso do seu deploy de duas formas:

1.  **Link no Terminal:** Após iniciar um deploy, o CLI fornecerá um link para o console do Firebase, onde você pode ver o status em tempo real.
2.  **Console do Firebase:** Navegue até a seção **Build > App Hosting** no console do seu projeto para ver o histórico de deploys, status e acessar os logs de build e de execução.

---

## Solução de Problemas Comuns

-   **Erro: `Failed to publish app`**
    -   **Causa:** Geralmente, a aplicação falhou ao iniciar no servidor.
    -   **Solução:** Verifique se **todos** os secrets listados em `firebase.json` foram criados no Secret Manager e se o App Hosting tem permissão para acessá-los. Inspecione os logs de execução no console para ver a mensagem de erro detalhada.

-   **Erro: `Cannot understand what targets to deploy`**
    -   **Causa:** O arquivo `firebase.json` não está configurado corretamente para o App Hosting.
    -   **Solução:** Garanta que a seção `"apphosting": { "backends": ["your-backend-name"] }` existe em seu `firebase.json`.

-   **Conflito de Rotas (Erro de Build)**
    -   **Causa:** Múltiplos arquivos `page.tsx` resolvendo para a mesma rota (ex: `/`).
    -   **Solução:** Renomeie os arquivos conflitantes para que não sejam considerados rotas ativas (ex: de `page.tsx` para `_page.tsx`).
