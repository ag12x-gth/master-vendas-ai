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
        const sessionData = sessionManager.getSession(params.id);
        if (sessionData?.qr) {
          const data = `data: ${JSON.stringify({ qr: sessionData.qr })}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        const onQR = (qr: string) => {
          const data = `data: ${JSON.stringify({ qr })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        const onConnected = () => {
          const data = `data: ${JSON.stringify({ status: 'connected' })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        };

        const onDisconnected = () => {
          const data = `data: ${JSON.stringify({ status: 'disconnected' })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        };

        emitter.on('qr', onQR);
        emitter.on('connected', onConnected);
        emitter.on('disconnected', onDisconnected);

        const keepAliveInterval = setInterval(() => {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        }, 30000);

        return () => {
          clearInterval(keepAliveInterval);
          emitter.off('qr', onQR);
          emitter.off('connected', onConnected);
          emitter.off('disconnected', onDisconnected);
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
