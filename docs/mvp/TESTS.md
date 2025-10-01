# Estratégia de Testes - ZAP Master

Este documento descreve a abordagem de testes utilizada no projeto para garantir a qualidade e a estabilidade do código.

## 1. Ferramentas Utilizadas

- **Framework de Testes:** [Jest](https://jestjs.io/)
- **Testes de Componentes:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Linting e Qualidade de Código:** [ESLint](https://eslint.org/) e [Prettier](https://prettier.io/)
- **Hooks de Git:** [Husky](https://typicode.github.io/husky/) com [lint-staged](https://github.com/okonet/lint-staged) e [commitlint](https://commitlint.js.org/)

## 2. Tipos de Testes

A estratégia de testes é dividida em várias camadas:

### a) Testes Estáticos (Static Testing)
- **Type Checking:** O TypeScript (`tsc --noEmit`) é executado no `pre-commit` e na pipeline de CI para garantir que não existem erros de tipo. A configuração `strict` está ativada no `tsconfig.json`.
- **Linting:** O ESLint é executado para detetar problemas de código e garantir a adesão aos padrões definidos.

### b) Testes Unitários (Unit Tests)
- **Foco:** Funções puras e isoladas, principalmente em `/src/lib/utils.ts` e outras lógicas de negócio desacopladas.
- **Objetivo:** Validar que uma pequena unidade de código funciona como esperado, dados diferentes inputs.
- **Exemplo:** Testar a função `canonicalizeBrazilPhone` para garantir que ela adiciona ou remove o nono dígito corretamente.

### c) Testes de Integração (Integration Tests)
- **Foco:** Interação entre múltiplos componentes ou entre a API e a base de dados.
- **Objetivo:** Garantir que diferentes partes do sistema funcionam bem em conjunto.
- **Exemplo:** Testar um endpoint de API para verificar se ele cria um registo no banco de dados e retorna o status HTTP correto.

### d) Testes End-to-End (E2E) - (Planeado)
- **Foco:** Simular fluxos completos do utilizador no navegador.
- **Objetivo:** Validar a experiência do utilizador do início ao fim.
- **Ferramenta (Proposta):** Cypress ou Playwright.
- **Exemplo:** Testar o fluxo completo de login, criação de uma campanha e logout.

## 3. Como Rodar os Testes

- **Executar todos os testes:**
  ```bash
  npm test
  ```
- **Executar em modo "watch":**
  ```bash
  npm test -- --watch
  ```

## 4. Hooks de Git e Qualidade Contínua

Para garantir que apenas código de alta qualidade seja adicionado ao repositório, foram configurados hooks de Git com o Husky:

- **`pre-commit`**: Antes de cada commit, os seguintes comandos são executados:
  1. `tsc --noEmit`: Verifica se há erros de tipo.
  2. `eslint --fix`: Verifica e corrige problemas de linting.
  3. `prettier --write`: Formata o código.
  4. `npm test`: Executa os testes automatizados.
- **`commit-msg`**: Antes de finalizar o commit, o `commitlint` verifica se a mensagem do commit segue o padrão **Conventional Commits**.

Esta automação impede que commits com erros de tipo, de linting, que quebram os testes ou com mensagens mal formatadas sejam adicionados ao histórico do Git.
