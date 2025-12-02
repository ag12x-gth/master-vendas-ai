import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { processPendingCampaigns } from '@/services/campaign-processing.service';

const QUEUE_NAME = 'campaign-trigger-queue';
const JOB_NAME = 'process-pending-campaigns';
const POLLING_INTERVAL_MS = 30000;

let campaignTriggerQueue: Queue | null = null;
let campaignTriggerWorker: Worker | null = null;
let campaignTriggerEvents: QueueEvents | null = null;
let redisConnection: Redis | null = null;
let isInitialized = false;
let shutdownHandlersRegistered = false;

declare global {
  // eslint-disable-next-line no-var
  var __campaignTriggerWorkerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __campaignTriggerShutdownRegistered: boolean | undefined;
}

function getRedisConnection(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[CampaignTriggerWorker] REDIS_URL não configurada. Worker não iniciará.');
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
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

async function initializeCampaignTriggerWorker(): Promise<boolean> {
  if (global.__campaignTriggerWorkerInitialized) {
    console.log('[CampaignTriggerWorker] Worker já inicializado (hot-reload detectado).');
    return true;
  }

  if (isInitialized) {
    return true;
  }

  const connection = getRedisConnection();
  if (!connection) {
    return false;
  }

  redisConnection = connection;

  try {
    registerShutdownHandlers();

    campaignTriggerQueue = new Queue(QUEUE_NAME, { connection });

    campaignTriggerWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (job.name !== JOB_NAME) return;

        console.log(`[CampaignTriggerWorker] 🔄 Executando job de processamento de campanhas...`);
        const startTime = Date.now();

        try {
          const result = await processPendingCampaigns();
          const duration = Date.now() - startTime;

          if (result.processed > 0) {
            console.log(
              `[CampaignTriggerWorker] ✅ Job concluído em ${duration}ms: ${result.successful} enviadas, ${result.failed} falhas, ${result.skipped} puladas`
            );
          }

          return result;
        } catch (error) {
          console.error('[CampaignTriggerWorker] ❌ Erro no job:', error);
          throw error;
        }
      },
      {
        connection,
        concurrency: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    );

    campaignTriggerEvents = new QueueEvents(QUEUE_NAME, { connection });

    campaignTriggerWorker.on('completed', (job) => {
      const result = job.returnvalue;
      if (result?.processed > 0) {
        console.log(`[CampaignTriggerWorker] 📊 Job ${job.id} completado:`, result);
      }
    });

    campaignTriggerWorker.on('failed', (job, error) => {
      console.error(`[CampaignTriggerWorker] ❌ Job ${job?.id} falhou:`, error.message);
    });

    const existingJobs = await campaignTriggerQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      if (job.name === JOB_NAME) {
        await campaignTriggerQueue.removeRepeatableByKey(job.key);
      }
    }

    await campaignTriggerQueue.add(
      JOB_NAME,
      {},
      {
        repeat: {
          every: POLLING_INTERVAL_MS,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    isInitialized = true;
    global.__campaignTriggerWorkerInitialized = true;

    console.log(
      `[CampaignTriggerWorker] ✅ Worker iniciado com sucesso. Polling a cada ${POLLING_INTERVAL_MS / 1000}s`
    );

    return true;
  } catch (error) {
    console.error('[CampaignTriggerWorker] ❌ Falha ao inicializar:', error);

    if (redisConnection) {
      try {
        await redisConnection.quit();
      } catch (_) { /* ignore close error */ }
      redisConnection = null;
    }

    return false;
  }
}

async function shutdownCampaignTriggerWorker(): Promise<void> {
  console.log('[CampaignTriggerWorker] 🛑 Encerrando worker...');

  try {
    if (campaignTriggerWorker) {
      await campaignTriggerWorker.close();
      campaignTriggerWorker = null;
    }

    if (campaignTriggerEvents) {
      await campaignTriggerEvents.close();
      campaignTriggerEvents = null;
    }

    if (campaignTriggerQueue) {
      await campaignTriggerQueue.close();
      campaignTriggerQueue = null;
    }

    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
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
  campaignTriggerQueue,
  QUEUE_NAME,
  JOB_NAME,
};
