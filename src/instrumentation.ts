export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Iniciando serviços do servidor...');

    try {
      const { initializeCampaignTriggerWorker } = await import(
        '@/workers/campaign-trigger.worker'
      );

      const success = await initializeCampaignTriggerWorker();

      if (success) {
        console.log('[Instrumentation] ✅ Worker de campanhas iniciado com sucesso');
      } else {
        console.warn(
          '[Instrumentation] ⚠️ Worker de campanhas não iniciou (Redis pode não estar disponível)'
        );
      }
    } catch (error) {
      console.error('[Instrumentation] ❌ Erro ao iniciar worker de campanhas:', error);
    }
  }
}
