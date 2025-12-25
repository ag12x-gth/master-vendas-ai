import { Eko, SimpleHttpMcpClient } from "@eko-ai/eko";
import type {
  Agent,
  EkoConfig,
  LLMs,
  StreamCallback,
  HumanCallback,
} from "@eko-ai/eko";
import { BrowserAgent, FileAgent } from "@eko-ai/eko-nodejs";

import {
  CallbackContext,
  createHumanCallback,
  createStreamCallback,
} from "./eko-callbacks";

type DefaultMcpClient = NonNullable<EkoConfig["defaultMcpClient"]>;

export type BuildOptions = {
  streamCallback?: StreamCallback;
  humanCallback?: HumanCallback;
  callbackContext?: CallbackContext;
  planLlms?: string[];
  agents?: Agent[];
  llms?: Partial<LLMs>;
  mcpClient?: DefaultMcpClient;
};

const openRouterConfig = {
  provider: "openrouter" as const,
  model: process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.6",
  apiKey: process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  config: {
    baseURL: process.env.OPENROUTER_BASE_URL ?? process.env.OPENAI_BASE_URL,
    topK: 5,
  },
  options: {
    "OpenRouter-Site-Url": process.env.OPENROUTER_SITE_URL,
    "OpenRouter-Title": process.env.OPENROUTER_TITLE ?? "Master Vendas AI",
  },
};

const anthropicConfig = {
  provider: "anthropic" as const,
  model: "claude-3-7-sonnet",
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  config: {
    baseURL: process.env.ANTHROPIC_BASE_URL,
    topK: 5,
  },
};

const openAiConfig = {
  provider: "openai" as const,
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY ?? "",
  config: {
    baseURL: process.env.OPENAI_BASE_URL,
    topP: 0.7,
  },
};

const baseLlms: LLMs = {
  default: openRouterConfig.apiKey ? openRouterConfig : anthropicConfig,
  planner: openRouterConfig.apiKey ? openRouterConfig : anthropicConfig,
  openrouter: openRouterConfig,
  anthropic: anthropicConfig,
  openai: openAiConfig,
};

export const createDefaultAgents = (): Agent[] => {
  return [new BrowserAgent(), new FileAgent()];
};

export function buildEko(options: BuildOptions = {}) {
  const {
    streamCallback,
    humanCallback,
    planLlms,
    agents,
    llms,
    callbackContext,
    mcpClient,
  } = options;

  const mergedLlms: LLMs = { ...baseLlms };
  if (llms) {
    for (const [key, value] of Object.entries(llms)) {
      if (value) {
        mergedLlms[key] = value;
      }
    }
  }

  const context: CallbackContext = callbackContext ?? {};

  let mergedCallbacks: (StreamCallback & HumanCallback) | undefined;
  if (streamCallback) {
    mergedCallbacks = { ...streamCallback } as StreamCallback & HumanCallback;
    if (humanCallback) {
      mergedCallbacks = Object.assign(mergedCallbacks, humanCallback);
    }
  } else {
    mergedCallbacks = {
      ...createStreamCallback(context),
      ...createHumanCallback(context),
    };
  }

  let defaultMcpClient = mcpClient;
  if (!defaultMcpClient && process.env.EKO_MCP_HTTP_URL) {
    const headers: Record<string, string> = {};
    if (process.env.EKO_MCP_API_KEY) {
      headers.Authorization = `Bearer ${process.env.EKO_MCP_API_KEY}`;
    }

    defaultMcpClient = new SimpleHttpMcpClient(process.env.EKO_MCP_HTTP_URL, "master-vendas-ai", headers);
  }

  const config: EkoConfig = {
    llms: mergedLlms,
    planLlms: planLlms ?? ["planner"],
    agents: agents ?? createDefaultAgents(),
    callback: mergedCallbacks,
    defaultMcpClient,
  };

  return new Eko(config);
}
