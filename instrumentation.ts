/**
 * Next.js Instrumentation Hook
 * This file is called automatically when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] 🚀 Server-side initialization starting...');
    
    try {
      // Initialize Campaign Trigger Worker
      const { initializeCampaignTriggerWorker } = await import('@/workers/campaign-trigger.worker');
      console.log('[Instrumentation] Initializing CampaignTriggerWorker...');
      await initializeCampaignTriggerWorker();
      console.log('[Instrumentation] ✅ CampaignTriggerWorker initialized');
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to initialize CampaignTriggerWorker:', error);
    }

    try {
      // Initialize Baileys Session Manager
      const { sessionManager } = await import('@/services/baileys-session-manager');
      console.log('[Instrumentation] Initializing Baileys sessions...');
      await sessionManager.initializeSessions();
      console.log('[Instrumentation] ✅ Baileys sessions restored');
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to initialize Baileys sessions:', error);
    }

    console.log('[Instrumentation] ✅ Server-side initialization complete');
  }
}
