# Funcionalidade de Automações com React Flow - Adiada para o MVP

A funcionalidade de criação de fluxos de automação, que utiliza a biblioteca React Flow, foi temporariamente desativada para o lançamento da versão MVP (Produto Mínimo Viável) da aplicação.

O objetivo é garantir a estabilidade e focar nas funcionalidades centrais do sistema. A integração e a lógica de execução das automações serão reativadas e finalizadas numa futura versão.

## Como Reativar a Funcionalidade

Para reativar o editor de automações na plataforma, os seguintes passos devem ser seguidos:

1.  **Restaurar Rotas no App Router:**
    *   Crie novamente a estrutura de pastas e os ficheiros de página para as rotas `/automations` e `/automations/[automationId]`.

2.  **Restaurar Componentes de UI:**
    *   **Menu Lateral:** No ficheiro `src/components/app-sidebar.tsx`, reintroduza o item de menu "Automações" no array `allNavItems`.
    *   **Restaurar Componentes do Editor:** Restaure os ficheiros dos componentes do editor a partir do histórico do Git, incluindo:
        *   `src/components/automations/automation-editor.tsx`
        *   `src/components/automations/sidebar.tsx`
        *   `src/components/automations/nodes/*`

3.  **Revisar Dependências:**
    *   Garanta que a biblioteca `reactflow` está instalada e configurada corretamente no `package.json`.

4.  **Reativar Lógica de Backend:**
    *   Implemente os endpoints de API em `/api/v1/automations` para salvar e carregar os dados dos fluxos.
    *   Desenvolva o "motor de execução" para processar os fluxos salvos.

5.  **Testes:**
    *   Realize testes completos no fluxo de criação, salvamento, carregamento e execução das automações.
