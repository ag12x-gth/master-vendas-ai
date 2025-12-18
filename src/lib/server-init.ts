let serverInitialized = false;

declare global {
  // eslint-disable-next-line no-var
  var __serverInitialized: boolean | undefined;
}

export async function initializeServer(): Promise<void> {
  if (typeof window !== 'undefined') return;
  if (global.__serverInitialized || serverInitialized) return;
  if (process.env.SKIP_SERVER_INIT === 'true') return;
  
  serverInitialized = true;
  global.__serverInitialized = true;

  console.log('[ServerInit] 🚀 Initializing server-side services...');

  try {
    const { initializeCampaignTriggerWorker } = await import('@/workers/campaign-trigger.worker');
    await initializeCampaignTriggerWorker();
    console.log('[ServerInit] ✅ Campaign trigger worker started');
  } catch (error) {
    console.error('[ServerInit] ❌ Failed to start campaign worker:', error);
  }

  try {
    const { sessionManager } = await import('@/services/baileys-session-manager');
    await sessionManager.initializeSessions();
    console.log('[ServerInit] ✅ Baileys sessions restored');
  } catch (error) {
    console.error('[ServerInit] ❌ Failed to restore Baileys sessions:', error);
  }
}

if (typeof window === 'undefined') {
  initializeServer().catch(console.error);
}
