# Eko 3.0 Integration Playbook

## 1. Overview
- **Purpose**: Provide a repeatable blueprint to embed Fellou Eko 3.0 agent workflows into `master-vendas-ai/` and future Windsurf projects.
- **Source Docs**: `docs/eko_raw/getting-started-quickstart.txt`, `docs/eko_raw/eko_docs_getting-started_eko.txt`, `docs/eko_raw/architecture.txt`, `docs/eko_raw/eko_docs_getting-started_configuration.txt`, `docs/eko_raw/eko_docs_agents_browser-agent.txt`, and related agent/environment files.
- **Key Capabilities**: Dependency-aware multi-agent orchestration, workflow pause/resume (`task_snapshot`), MCP extensibility, configurable LLM routing, and cross-environment agent support (extension, Node.js, web, Fellou browser).

## 2. Architectural Principles (`architecture.txt`, `eko_docs_getting-started_eko.txt`)
- **Planner → Workflow → Agents**: `Eko.generate()` converts prompts to XML workflows; `Eko.run()` executes tasks via agents. Workflow nodes encode agent assignments, subtasks, and planner thoughts for inspection.
- **Separation of Concerns**: Planner never executes tasks; agents consume workflow nodes and invoke tools. Enables plan review/edit before execution and supports human-in-the-loop interventions.
- **Memory Layer**: Compresses context, deduplicates tool calls, and persists `task_snapshot` checkpoints for pause/resume and recovery.
- **MCP/A2A Hooks**: `defaultMcpClient` injects dynamic tools/services (e.g., Fellou integrations). `a2aClient` reserved for inter-agent messaging.
- **Execution Controls**: Built-in pause, resume, and abort leveraging snapshots. Align with application UI/monitoring to expose safe operators.

## 3. Configuration Blueprint (`eko_docs_getting-started_configuration.txt`)
- **`EkoConfig.llms`**: Define provider map with model, API key, base URL, and tuning (`topK`, `topP`). Recommendation: use `claude-3-7-sonnet` (planner) + `gpt-4o-mini` (workers) + optional open weights.
- **`planLlms`**: Supply array of high-quality model keys (e.g., `['planner']`) for deterministic planning under heavy workloads.
- **`agents`**: Instantiate via factories; each agent can override `llms` and `mcpClient`. Use dependency injection to pass project-specific context (company ID, logging, secrets).
- **`callback`**: Implement `StreamCallback` → pipe progress to websocket/UI logger. Implement `HumanCallback` → request approvals or data entry through Windsurf operator console.
- **`defaultMcpClient`**: Point to existing MCP HTTP server (Fellou/Eko). Provide registration helper that mounts additional tool endpoints per deployment stage.
- **Environment Variables**: Require `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`. Secure them via backend proxy—never expose to frontend code.

## 4. Agent Patterns (`eko_docs_agents_browser-agent.txt`, `eko_docs_agents_custom-agent.txt`, `eko_docs_agents_mcp-tools.txt`, `eko_docs_agents_tools.txt`)
- **Browser Agent**: Core for web automation. Export factories for Node.js (`@eko-ai/eko-nodejs` + Playwright), extension, and web contexts.
  ```ts
  import { BrowserAgent, FileAgent } from '@eko-ai/eko-nodejs';
  export const browserAgents = () => [
    new BrowserAgent({ /* env: createPlaywrightEnv(...) */ }),
    new FileAgent(),
  ];
  ```
- **Custom Agents**: Use `new Agent({ name, description, tools })` with `execute` returning `ToolResult[]`. Ideal for CRM, billing, Fellou-specific APIs.
- **MCP Tools**: Register external toolchains through MCP for dynamic capability loading without redeploying agents.
- **Callback-driven Control**: Capture `workflow` messages for plan visualization and deliver to auditing interfaces.
- **Best Practice**: Keep agent metadata descriptive (`name`, `description`, `tools`) to aid planner selection and human debugging.

## 5. Environment-Specific Guidance (Quickstart/Installation + environment docs)
- **Node.js** (`getting-started-installation.txt`, `eko_docs_environment_nodejs.txt`):
  - Install: `pnpm add @eko-ai/eko @eko-ai/eko-nodejs playwright ts-node`.
  - Run `npx playwright install` inside Docker image/CI.
  - Provide helper script `scripts/eko-demo.ts` replicating quickstart (news summary) to validate environment.
- **Browser Extension**: Maintain precompiled `dist/` or scaffold via `@eko-ai/eko-cli`. Document `chrome://extensions` setup for QA.
- **Web Sandbox**: Use `@eko-ai/eko-web` for front-end automation (limited to same-page DOM). Enforce proxy backend for API keys.
- **Fellou Environment**: Prepare design notes for delegating workflows to Fellou AI Browser; requires Fellou API credentials (to be stored securely).

## 6. Implementation TODOs for `master-vendas-ai/`
- **Create config module**: `src/lib/ai/eko-config.ts` containing `llms`, `planLlms`, `agents`, callbacks, MCP wiring, and helper `buildEko()` factory.
- **Add demo script**: `scripts/eko-demo.ts` with `npm run eko:demo`; include README instructions and optional Playwright installer command.
- **Update environment files**: Extend `.env.example` / `.env.local` with Eko variables and warnings against client-side exposure.
- **Document operations**: Add `docs/eko-integration-playbook.md` (this file) and cross-link from main project README.
- **Monitoring & UX**: Integrate `StreamCallback` output into existing logging/notification pipelines; design UI for `task_snapshot` resume flow.
- **Security review**: Ensure MCP tool registrations and custom agents enforce role-based access and logging.

## 7. Next Steps
1. Implement configuration module & demo scripts (see TODO above).
2. Capture missing `reference` documentation (403) manually and append to `docs/eko_raw/`.
3. Align Fellou-specific workflows with existing Masteria processes; map endpoints and secrets.
4. Establish regression tests for core Eko workflows (plan generation, agent execution, memory snapshot).

## 8. OpenRouter Knowledge Base (Quickstart Extract)
- **Documentation & Policies**: [`quickstart`](https://openrouter.ai/docs/quickstart), [`features`](https://openrouter.ai/docs/features), [`models`](https://openrouter.ai/docs/models), [`logging`](https://openrouter.ai/docs/logging), [`faq`](https://openrouter.ai/docs/faq), [`privacy`](https://openrouter.ai/docs/privacy), [`principles`](https://openrouter.ai/docs/principles)
- **API & Auth**: [`api-reference`](https://openrouter.ai/docs/api-reference), [`keys`](https://openrouter.ai/docs/keys), [`limits`](https://openrouter.ai/docs/limits), [`parameters`](https://openrouter.ai/docs/parameters), [`streaming`](https://openrouter.ai/docs/streaming), [`errors`](https://openrouter.ai/docs/errors), [`responses`](https://openrouter.ai/docs/responses), [`authentication`](https://openrouter.ai/docs/authentication), [`provisioning`](https://openrouter.ai/docs/provisioning), [`app-attribution`](https://openrouter.ai/docs/app-attribution)
- **Endpoints & Monitoring**: [`get-list-models`](https://openrouter.ai/docs/get-list-models), [`get-list-endpoints`](https://openrouter.ai/docs/get-list-endpoints), [`get-list-providers`](https://openrouter.ai/docs/get-list-providers), [`get-credits`](https://openrouter.ai/docs/get-credits), [`post-chat-completion`](https://openrouter.ai/docs/post-chat-completion), [`post-completion`](https://openrouter.ai/docs/post-completion), [`get-generation`](https://openrouter.ai/docs/get-generation)
- **Advanced Features**: [`tool-calling`](https://openrouter.ai/docs/tool-calling), [`structured-outputs`](https://openrouter.ai/docs/structured-outputs), [`prompt-caching`](https://openrouter.ai/docs/prompt-caching), [`model-routing`](https://openrouter.ai/docs/model-routing), [`provider-routing`](https://openrouter.ai/docs/provider-routing), [`message-transforms`](https://openrouter.ai/docs/message-transforms), [`web-search`](https://openrouter.ai/docs/web-search), [`latency`](https://openrouter.ai/docs/latency), [`uptime`](https://openrouter.ai/docs/uptime), [`zdr`](https://openrouter.ai/docs/zdr), [`zci`](https://openrouter.ai/docs/zci)
- **Security**: [`oauth`](https://openrouter.ai/docs/oauth), [`pkce`](https://openrouter.ai/docs/pkce)
- **E2E Integrations**: [`frameworks`](https://openrouter.ai/docs/frameworks), [`vercel-ai-sdk`](https://openrouter.ai/docs/vercel-ai-sdk), [`openai-sdk`](https://openrouter.ai/docs/openai-sdk), [`effect-ai-sdk`](https://openrouter.ai/docs/effect-ai-sdk), [`langchain`](https://openrouter.ai/docs/langchain), [`langfuse`](https://openrouter.ai/docs/langfuse), [`mastra`](https://openrouter.ai/docs/mastra), [`pydanticai`](https://openrouter.ai/docs/pydanticai), [`xcode`](https://openrouter.ai/docs/xcode), [`zapier`](https://openrouter.ai/docs/zapier), [`discord`](https://openrouter.ai/docs/discord)
- **Operations & Infra**: [`mcp`](https://openrouter.ai/docs/mcp), [`organization`](https://openrouter.ai/docs/organization)

### 8.1 Model Inventory Maintenance
- **`npm run openrouter:models`**: atualiza `docs/openrouter/models.json` e `docs/openrouter/models-summary.md`. Execute manualmente após trocar chaves ou antes de liberar novas features que dependam de modelos específicos.
- **Monitoramento**: adicione alerta para diffs em `docs/openrouter/models-summary.md`; mudanças de pricing ou remoções devem ser revisadas antes de novos deployments.

### 8.2 Human-in-the-loop Navigation
- **Sinal do problema**: quando o log registra `Error: There is no page, please call navigate_to first` (ex.: `logs/eko/eko-demo-2025-10-02T04-05-21-611Z.log`, `...T04-44-55-074Z.log`), significa que o `BrowserAgent` não encontrou uma página ativa após o planejamento inicial.
- **Ação imediata**: abra o painel que consome `createHumanCallback()` e envie uma resposta de aprovação com comando explícito `navigate_to https://www.google.com/` ou resolva o CAPTCHA solicitado. Use o endpoint `POST /api/eko/human-requests` se estiver operando via API.
- **Evidência de repetição**: novas execuções (`logs/eko/eko-demo-2025-10-02T05-09-47-332Z.log`, `...T05-13-08-638Z.log`) mostram o mesmo padrão, reforçando a necessidade de intervenção humana até integrarmos automação de navegação inicial.
- **Próximos passos**: considere adicionar `initialUrl` no contexto do agente ou criar ferramenta especializada que sempre navega antes do primeiro `current_page`.
- **Alerta de tool inexistente**: não há tool `request_user_help`; configure o handler de callbacks para identificar esse erro nos logs e orientar o operador a responder manualmente via painel/API.

### 8.3 Operação diária (Checklist)
- **Monitorar logs**: revisar `logs/eko/` a cada execução; se surgir erro de navegação ou CAPTCHA, seguir a instrução acima e registrar a intervenção.
- **Registrar evidências**: anexar o nome do arquivo de log e o ID do modelo utilizado em cada execução ao repositório de observabilidade (planilha, ticket ou README operacional).
- **Escalar bloqueios**: se o CAPTCHA persistir após tentativa manual, abrir ticket descrevendo horário (`2025-10-02T04:05:40Z` no exemplo) e anexar screenshot do painel.
- **Registrar intervenção humana**: anexar o nome do arquivo de log e o ID do modelo utilizado em cada intervenção ao repositório de observabilidade (planilha, ticket ou README operacional).
