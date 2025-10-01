// src/lib/circuit-breaker.ts

export type Provider = 'openai' | 'google';

type State = {
  openUntil?: number; // epoch ms
};

const state: Record<Provider, State> = {
  openai: {},
  google: {}
};

// Janela padrão de meia-vida do breaker (pode ajustar via env)
const DEFAULT_COOLDOWN_MS = Number(process.env.AI_BREAKER_COOLDOWN_MS ?? 60_000);

export function isOpen(provider: Provider): boolean {
  const now = Date.now();
  const providerState = state[provider];
  if (!providerState) {
    console.warn(`[Circuit Breaker] Provider '${provider}' não encontrado no estado.`);
    return false;
  }
  const openUntil = providerState.openUntil ?? 0;
  return openUntil > now;
}

export function trip(provider: Provider, cooldownMs: number = DEFAULT_COOLDOWN_MS): void {
  const providerState = state[provider];
  if (!providerState) {
    console.warn(`[Circuit Breaker] Provider '${provider}' não encontrado no estado. Inicializando...`);
    state[provider] = {};
  }
  state[provider].openUntil = Date.now() + cooldownMs;
}

export function reset(provider: Provider): void {
  const providerState = state[provider];
  if (!providerState) {
    console.warn(`[Circuit Breaker] Provider '${provider}' não encontrado no estado. Inicializando...`);
    state[provider] = {};
  }
  state[provider].openUntil = 0;
}
