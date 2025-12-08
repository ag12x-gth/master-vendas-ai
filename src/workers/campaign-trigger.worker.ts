import { processPendingCampaigns } from '@/services/campaign-processing.service';

const POLLING_INTERVAL_MS = 30000;

let pollingInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let isInitialized = false;
let shutdownHandlersRegistered = false;

declare global {
  // eslint-disable-next-line no-var
  var __campaignTriggerWorkerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __campaignTriggerShutdownRegistered: boolean | undefined;
  // eslint-disable-next-line no-var
  var __campaignPollingInterval: NodeJS.Timeout | undefined;
}

function registerShutdownHandlers(): void {
  if (global.__campaignTriggerShutdownRegistered || shutdownHandlersRegistered) {
    return;
  }

  const gracefulShutdown = async (signal: string) => {
    console.log(`[CampaignTriggerWorker] 🛑 Recebido ${signal}, encerrando...`);
    await shutdownCampaignTriggerWorker();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  shutdownHandlersRegistered = true;
  global.__campaignTriggerShutdownRegistered = true;
  console.log('[CampaignTriggerWorker] 🔧 Registered shutdown handlers (SIGINT, SIGTERM)');
}

async function processJob(): Promise<void> {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  console.log(`[CampaignTriggerWorker] 🔄 Executando job de processamento de campanhas...`);
  const startTime = Date.now();

  try {
    const result = await processPendingCampaigns();
    const duration = Date.now() - startTime;

    if (result.processed > 0) {
      console.log(
        `[CampaignTriggerWorker] ✅ Job concluído em ${duration}ms: ${result.successful} enviadas, ${result.failed} falhas, ${result.skipped} puladas`
      );
    } else {
      console.log(`[CampaignTriggerWorker] ⏳ Nenhuma campanha pendente (${duration}ms)`);
    }
  } catch (error) {
    console.error('[CampaignTriggerWorker] ❌ Erro no job:', error);
  } finally {
    isProcessing = false;
  }
}

async function initializeCampaignTriggerWorker(): Promise<boolean> {
  if (global.__campaignTriggerWorkerInitialized) {
    console.log('[CampaignTriggerWorker] Worker já inicializado (hot-reload detectado).');
    return true;
  }

  if (isInitialized) {
    return true;
  }

  try {
    registerShutdownHandlers();

    if (global.__campaignPollingInterval) {
      clearInterval(global.__campaignPollingInterval);
    }

    await processJob();

    pollingInterval = setInterval(processJob, POLLING_INTERVAL_MS);
    global.__campaignPollingInterval = pollingInterval;

    isInitialized = true;
    global.__campaignTriggerWorkerInitialized = true;

    console.log(
      `[CampaignTriggerWorker] ✅ Worker iniciado com sucesso. Polling a cada ${POLLING_INTERVAL_MS / 1000}s`
    );

    return true;
  } catch (error) {
    console.error('[CampaignTriggerWorker] ❌ Falha ao inicializar:', error);
    return false;
  }
}

async function shutdownCampaignTriggerWorker(): Promise<void> {
  console.log('[CampaignTriggerWorker] 🛑 Encerrando worker...');

  try {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }

    if (global.__campaignPollingInterval) {
      clearInterval(global.__campaignPollingInterval);
      global.__campaignPollingInterval = undefined;
    }

    isInitialized = false;
    global.__campaignTriggerWorkerInitialized = false;

    console.log('[CampaignTriggerWorker] ✅ Worker encerrado com sucesso.');
  } catch (error) {
    console.error('[CampaignTriggerWorker] ❌ Erro ao encerrar worker:', error);
  }
}

export {
  initializeCampaignTriggerWorker,
  shutdownCampaignTriggerWorker,
};
