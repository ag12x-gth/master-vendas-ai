import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
import { clearAuthState } from '@/services/baileys-auth-db';
import { db } from '@/lib/db';
import { connections, baileysAuthState, campaigns } from '@/lib/db/schema';
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
    
    await db.update(campaigns)
      .set({ connectionId: null })
      .where(eq(campaigns.connectionId, params.id));
    
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

      console.log(`[API] Reconnecting session ${params.id} - clearing old session and credentials...`);
      
      await sessionManager.deleteSession(params.id);
      
      await sessionManager.clearFilesystemAuth(params.id);
      
      await clearAuthState(params.id);

      console.log(`[API] Creating new session for ${params.id}...`);
      await sessionManager.createSession(params.id, connection.companyId);

      return NextResponse.json({
        success: true,
        message: 'Session reconnecting',
      });
    }

    if (action === 'resume') {
      const connection = await db.query.connections.findFirst({
        where: and(
          eq(connections.id, params.id),
          eq(connections.companyId, companyId)
        ),
      });

      if (!connection) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const hasAuth = await sessionManager.hasFilesystemAuth(params.id);
      if (!hasAuth) {
        return NextResponse.json({ 
          error: 'No saved credentials. Use reconnect action instead.',
          needsQRCode: true 
        }, { status: 400 });
      }

      console.log(`[API] Resuming session ${params.id} using existing credentials...`);
      
      await sessionManager.deleteSession(params.id);

      console.log(`[API] Creating session for ${params.id} with existing auth...`);
      await sessionManager.createSession(params.id, connection.companyId);

      return NextResponse.json({
        success: true,
        message: 'Session resuming with existing credentials',
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
