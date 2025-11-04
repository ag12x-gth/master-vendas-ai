import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
import { db } from '@/lib/db';
import { connections, baileysAuthState } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const sessionData = sessionManager.getSession(params.id);

    return NextResponse.json({
      id: connection.id,
      name: connection.config_name,
      status: sessionData?.status || connection.status || 'disconnected',
      phone: connection.phone,
      lastConnected: connection.lastConnected,
      isActive: connection.isActive,
    });
  } catch (error) {
    console.error('[API] Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await sessionManager.deleteSession(params.id);

    await db.delete(baileysAuthState).where(eq(baileysAuthState.connectionId, params.id));
    
    await db.delete(connections).where(eq(connections.id, params.id));

    return NextResponse.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('[API] Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = await getCompanyIdFromSession();

    const body = await request.json();
    const { action } = body;

    if (action === 'reconnect') {
      const connection = await db.query.connections.findFirst({
        where: and(
          eq(connections.id, params.id),
          eq(connections.companyId, companyId)
        ),
      });

      if (!connection) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      await sessionManager.deleteSession(params.id);

      await sessionManager.createSession(params.id, connection.companyId);

      return NextResponse.json({
        success: true,
        message: 'Session reconnecting',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[API] Error reconnecting session:', error);
    return NextResponse.json(
      { error: 'Failed to reconnect session' },
      { status: 500 }
    );
  }
}
