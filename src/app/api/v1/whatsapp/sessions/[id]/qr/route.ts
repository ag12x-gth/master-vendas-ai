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
    const companyId = await getCompanyIdFromSession();

    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, params.id),
        eq(connections.companyId, companyId)
      ),
    });

    if (!connection) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emitter = sessionManager.getEventEmitter(params.id);
    
    if (!emitter) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;

        const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error('[QR SSE] Error enqueueing data:', error);
              isClosed = true;
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              controller.close();
              isClosed = true;
            } catch (error) {
              console.error('[QR SSE] Error closing controller:', error);
            }
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
          safeClose();
        };

        const onDisconnected = (data: any) => {
          const message = `data: ${JSON.stringify({ status: 'disconnected', reason: data?.reason })}\n\n`;
          safeEnqueue(encoder.encode(message));
          safeClose();
        };

        const onError = (error: any) => {
          const message = `data: ${JSON.stringify({ status: 'error', message: error?.message || 'Connection failed' })}\n\n`;
          safeEnqueue(encoder.encode(message));
          safeClose();
        };

        emitter.on('qr', onQR);
        emitter.on('connected', onConnected);
        emitter.on('disconnected', onDisconnected);
        emitter.on('error', onError);

        const keepAliveInterval = setInterval(() => {
          safeEnqueue(encoder.encode(': keepalive\n\n'));
        }, 30000);

        return () => {
          isClosed = true;
          clearInterval(keepAliveInterval);
          emitter.off('qr', onQR);
          emitter.off('connected', onConnected);
          emitter.off('disconnected', onDisconnected);
          emitter.off('error', onError);
        };
      },
      cancel() {
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
