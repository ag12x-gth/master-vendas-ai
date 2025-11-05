# Documentação de Integrações - Desativado para MVP

A funcionalidade de integração com CRMs externos (como a Kommo) foi temporariamente desativada para o lançamento da versão MVP (Produto Mínimo Viável) da aplicação.

O objetivo é garantir a estabilidade e focar nas funcionalidades centrais do sistema. A integração será reativada e finalizada numa futura versão.

## Como Reativar a Funcionalidade

Para reativar a integração com a Kommo, os seguintes passos devem ser seguidos:

1.  **Reativar UI:**
    *   **Menu de Configurações:** No ficheiro `src/app/(main)/settings/page.tsx`, descomente o `TabsTrigger` e o `TabsContent` referentes a "Integrações".
    *   **Dashboard:** No ficheiro `src/components/dashboard/page.tsx`, descomente o componente `<CrmSyncErrors />`.
    *   **Kanban:** No ficheiro `src/components/kanban/funnel-list.tsx`, reative o botão "Mapear Kommo" se necessário.

2.  **Reativar Lógica de Backend:**
    *   **Gatilho de Sincronização:** No ficheiro `src/app/api/v1/conversations/start/route.ts`, descomente a chamada à função `syncContactAndLeadWithKommo` no final do `POST handler`.
    *   **Restaurar Rotas de API:** Restaure os ficheiros de rota de API em `/src/app/api/v1/integrations/*` a partir do histórico do Git.

3.  **Testes:**
    *   Após reativar, realize testes completos no fluxo de conexão, mapeamento e sincronização de dados entre o ZAP Master e a Kommo.
