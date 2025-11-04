import { NextRequest } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
import { getCompanyIdFromSession } from '@/app/actions';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[QR SSE] Starting QR stream for session:', params.id);
    
    const companyId = await getCompanyIdFromSession();
    console.log('[QR SSE] Company ID from session:', companyId);

    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, params.id),
        eq(connections.companyId, companyId)
      ),
    });

    console.log('[QR SSE] Connection found:', connection ? 'YES' : 'NO');

    if (!connection) {
      console.error('[QR SSE] Connection not found. Session ID:', params.id, 'Company ID:', companyId);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emitter = sessionManager.getEventEmitter(params.id);
    console.log('[QR SSE] EventEmitter found:', emitter ? 'YES' : 'NO');
    
    if (!emitter) {
      console.error('[QR SSE] EventEmitter not found for session:', params.id);
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let cleanupFn: (() => void) | null = null;
    
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              if (error instanceof Error && error.message.includes('Controller is already closed')) {
                console.log('[QR SSE] Client disconnected, stopping stream');
              } else {
                console.error('[QR SSE] Error enqueueing data:', error);
              }
              isClosed = true;
              cleanup();
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch (error) {
              console.log('[QR SSE] Controller already closed');
            }
            cleanup();
          }
        };

        const cleanup = () => {
          if (cleanupFn) {
            cleanupFn();
            cleanupFn = null;
          }
        };

        const sessionData = sessionManager.getSession(params.id);
        if (sessionData?.qr) {
          const data = `data: ${JSON.stringify({ qr: sessionData.qr })}\n\n`;
          safeEnqueue(encoder.encode(data));
        }

        const onQR = (qr: string) => {
          const data = `data: ${JSON.stringify({ qr })}\n\n`;
          safeEnqueue(encoder.encode(data));
        };

        const onConnected = (data: any) => {
          const message = `data: ${JSON.stringify({ status: 'connected', phone: data?.phone })}\n\n`;
          safeEnqueue(encoder.encode(message));
          setTimeout(() => safeClose(), 100);
        };

        const onDisconnected = (data: any) => {
          const message = `data: ${JSON.stringify({ status: 'disconnected', reason: data?.reason })}\n\n`;
          safeEnqueue(encoder.encode(message));
          setTimeout(() => safeClose(), 100);
        };

        const onError = (error: any) => {
          const message = `data: ${JSON.stringify({ status: 'error', message: error?.message || 'Connection failed' })}\n\n`;
          safeEnqueue(encoder.encode(message));
          setTimeout(() => safeClose(), 100);
        };

        emitter.on('qr', onQR);
        emitter.on('connected', onConnected);
        emitter.on('disconnected', onDisconnected);
        emitter.on('error', onError);

        const keepAliveInterval = setInterval(() => {
          if (!isClosed) {
            safeEnqueue(encoder.encode(': keepalive\n\n'));
          }
        }, 30000);

        const autoCloseTimeout = setTimeout(() => {
          console.log('[QR SSE] Auto-closing stream after 5 minutes');
          safeClose();
        }, 5 * 60 * 1000);

        cleanupFn = () => {
          if (!isClosed) {
            isClosed = true;
          }
          clearInterval(keepAliveInterval);
          clearTimeout(autoCloseTimeout);
          emitter.off('qr', onQR);
          emitter.off('connected', onConnected);
          emitter.off('disconnected', onDisconnected);
          emitter.off('error', onError);
          console.log('[QR SSE] Cleanup completed for session:', params.id);
        };
      },
      cancel() {
        console.log('[QR SSE] Stream cancelled by client for session:', params.id);
        if (cleanupFn) {
          cleanupFn();
          cleanupFn = null;
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[API] Error in QR SSE:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
