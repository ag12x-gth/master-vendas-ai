// ✅ INTERNAL API - Server-only worker initialization
// This route handler is GUARANTEED to be server-side only
// Webpack will NEVER try to bundle this for the client

import { type NextRequest, NextResponse } from 'next/server';

let workerInitialized = false;

/**
 * Internal route to initialize campaign trigger worker
 * Called once on application startup via app initialization
 */
export async function GET(request: NextRequest) {
  return handleWorkerInit(request);
}

export async function POST(request: NextRequest) {
  return handleWorkerInit(request);
}

async function handleWorkerInit(request: NextRequest) {
  // Verify this is an internal request (same origin, no auth required for internal calls)
  const host = request.headers.get('host');
  const _referer = request.headers.get('referer');

  // Allow both localhost and Replit domain
  const isInternal = host?.includes('localhost') || host?.includes('replit.dev');
  
  if (!isInternal) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Initialize worker only once
  if (workerInitialized) {
    return NextResponse.json({ 
      status: 'already_initialized',
      message: 'Campaign trigger worker is already running'
    });
  }

  try {
    // ✅ Dynamic import of Node.js code - GUARANTEED server-side
    // eslint-disable-next-line global-require
    const { initializeCampaignTriggerWorker } = require('@/workers/campaign-trigger.worker');

    console.log('[InitWorkerRoute] 🚀 Initializing campaign trigger worker...');
    
    // Fire-and-forget with timeout
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn('[InitWorkerRoute] ⚠️ Worker initialization timeout after 30s');
        resolve(false);
      }, 30000);
    });

    const success = await Promise.race([
      initializeCampaignTriggerWorker(),
      timeoutPromise
    ]);

    workerInitialized = true;

    if (success) {
      console.log('[InitWorkerRoute] ✅ Campaign trigger worker initialized successfully');
      return NextResponse.json({
        status: 'success',
        message: 'Campaign trigger worker initialized successfully'
      });
    } else {
      console.warn('[InitWorkerRoute] ⚠️ Worker did not initialize within timeout');
      return NextResponse.json({
        status: 'timeout',
        message: 'Worker initialization timed out (Redis may not be available)'
      });
    }
  } catch (error) {
    console.error('[InitWorkerRoute] ❌ Error initializing worker:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize campaign trigger worker',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
