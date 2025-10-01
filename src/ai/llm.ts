// src/ai/llm.ts
// Implementação simples para substituir o sistema de agentes descontinuado

export interface ModelConfig {
  model: string;
  provider: string;
  modelName: string;
}

export function getActiveAIProviders(): string[] {
  return ['openai', 'anthropic'];
}

export async function getModel(): Promise<ModelConfig> {
  // Retorna configuração padrão simples
  return {
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    modelName: 'gpt-3.5-turbo'
  };
}