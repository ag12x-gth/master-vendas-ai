# Funcionalidade de IA com Genkit - Adiada para o MVP

A funcionalidade de IA, incluindo a criação de Personas e o Roteamento de Atendimentos, foi temporariamente desativada para o lançamento da versão MVP (Produto Mínimo Viável) da aplicação.

O objetivo é garantir a estabilidade e focar nas funcionalidades centrais do sistema. A integração com o Genkit e as funcionalidades de IA serão reativadas e finalizadas numa futura versão.

## Como Reativar a Funcionalidade

Para reativar a IA na plataforma, os seguintes passos devem ser seguidos:

1.  **Reativar UI (Navegação):**
    *   No ficheiro `src/components/app-sidebar.tsx`, descomente as linhas referentes aos itens de menu "IA" e "Roteamento" dentro do array `allNavItems`.
    *   Restaure os componentes de UI em `/src/components/ia` e `/src/components/routing` a partir do histórico do Git.

2.  **Revisar Endpoints de API:**
    *   Restaure os endpoints de API em `/src/app/api/v1/ia/*` e `/src/app/api/v1/roteamento/*` a partir do histórico do Git, garantindo que estão operacionais e alinhados com a lógica de frontend.

3.  **Testes:**
    *   Após reativar, realize testes completos no fluxo de criação de personas, configuração da base de conhecimento, regras de automação e roteamento de atendimentos.
