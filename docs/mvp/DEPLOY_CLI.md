# Deploy Manual via Linha de Comando (Firebase CLI)

Este documento descreve como fazer o deploy da aplicação manualmente a partir do seu terminal, usando o Firebase CLI. Este método é útil para ter mais controlo sobre o processo e para obter logs de erro detalhados caso o deploy automático falhe.

## Pré-requisitos

1.  **Node.js e npm:** Certifique-se de que tem o Node.js e o npm instalados na sua máquina.
2.  **Acesso de Owner ao Projeto Firebase:** Você precisa ter a permissão de "Owner" (Proprietário) ou "Firebase Admin" no projeto Firebase para realizar o deploy.

## Passo 1: Instalar o Firebase CLI

Se você ainda não tiver as ferramentas de linha de comando do Firebase, instale-as globalmente na sua máquina.

```bash
npm install -g firebase-tools
```

## Passo 2: Login na sua Conta Google

Execute o comando abaixo e siga as instruções no seu navegador para fazer login na conta Google associada ao seu projeto Firebase.

```bash
firebase login
```

## Passo 3: Selecionar o Projeto Firebase Correto

Navegue até a pasta raiz do seu projeto no terminal e execute o comando abaixo para garantir que você está a trabalhar no projeto correto.

```bash
# Substitua 'seu-project-id' pelo ID do seu projeto Firebase
firebase use seu-project-id
```

Se você não souber o ID do projeto, pode listá-los com `firebase projects:list`.

## Passo 4: Fazer o Deploy

Este é o comando final. Ele irá executar o processo de `build` da sua aplicação Next.js localmente e, se for bem-sucedido, fará o upload da versão de produção para o Firebase App Hosting.

```bash
firebase deploy --only hosting
```

Aguarde o processo terminar. O terminal irá mostrar o progresso do `build` e do upload. Se ocorrerem erros, eles serão exibidos diretamente no seu terminal, facilitando a depuração.

Ao final, o CLI irá fornecer a URL da sua aplicação publicada.
