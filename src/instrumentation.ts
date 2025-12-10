export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Iniciando serviços do servidor...');

    // IMPORTANTE: NÃO bloquear o startup com await
    // O worker se inicializa em background (fire-and-forget com timeout)
    initializeWorkerAsync();
  }
}

/**
 * Inicializa o worker de campanhas em background
 * Não bloqueia o startup da aplicação
 * Implementa timeout de 30s como proteção
 */
async function initializeWorkerAsync(): Promise<void> {
  try {
    const { initializeCampaignTriggerWorker } = await import(
      '@/workers/campaign-trigger.worker'
    );

    // Criar promise com timeout de 30 segundos
    const workerInitPromise = initializeCampaignTriggerWorker();
    const timeoutPromise = new Promise<false>((resolve) => {
      setTimeout(() => {
        console.warn('[Instrumentation] ⚠️ Worker de campanhas timeout após 30s');
        resolve(false);
      }, 30000);
    });

    // Race condition - retorna assim que uma das promises resolve
    const success = await Promise.race([workerInitPromise, timeoutPromise]);

    if (success) {
      console.log('[Instrumentation] ✅ Worker de campanhas iniciado com sucesso');
    } else {
      console.warn(
        '[Instrumentation] ⚠️ Worker de campanhas não iniciou (Redis pode não estar disponível ou timeout)'
      );
    }
  } catch (error) {
    console.error('[Instrumentation] ❌ Erro ao iniciar worker de campanhas:', error);
    console.log('[Instrumentation] ℹ️ Servidor continuará operacional sem o worker');
  }
}
