# Funcionalidade de Criação de Modelos - Adiada para o MVP

A funcionalidade de criação e edição de modelos de mensagem do WhatsApp diretamente na plataforma foi temporariamente desativada para o lançamento da versão MVP (Produto Mínimo Viável) da aplicação.

O objetivo é simplificar o escopo e garantir a estabilidade, focando no fluxo principal de sincronizar modelos já existentes na conta da Meta e utilizá-los nas campanhas.

A criação de modelos é um fluxo complexo que exige várias validações e chamadas à API da Meta, e será reativada e finalizada numa versão futura.

## Como Reativar a Funcionalidade

Para reativar a criação de modelos na plataforma, os seguintes passos devem ser seguidos:

1.  **Restaurar Componentes de UI:**
    *   **Botão "Criar Novo Modelo":** No ficheiro `src/app/(main)/templates/page.tsx`, reintroduza o componente `Link` e `Button` que aponta para a rota `/templates/new`.
    *   **Recriar a Rota:** Crie novamente a estrutura de pastas e o ficheiro `src/app/(main)/templates/new/page.tsx`.
    *   **Restaurar os Componentes:** Restaure os ficheiros dos componentes `src/components/templates/creation/template-form.tsx` e `src/components/templates/creation/template-preview.tsx` a partir do histórico do Git.

2.  **Revisar Endpoints de API:**
    *   Implemente os endpoints de API necessários para validar e enviar os dados do novo modelo para a API da Meta.

3.  **Testes:**
    *   Realize testes completos no fluxo de criação, validação de campos, pré-visualização e envio para a API da Meta.
