import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
import { clearAuthState } from '@/services/baileys-auth-db';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const currentEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    
    const [connection] = await db
      .insert(connections)
      .values({
        companyId,
        config_name: name,
        connectionType: 'baileys',
        status: 'connecting',
        isActive: true,
        environment: currentEnv,
      })
      .returning();

    if (connection) {
      await clearAuthState(connection.id);
      await sessionManager.createSession(connection.id, companyId);

      return NextResponse.json({
        success: true,
        session: {
          id: connection.id,
          name: connection.config_name,
          status: connection.status,
          connectionType: connection.connectionType,
        },
      });
    }

    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[API] Error creating Baileys session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const companyId = await getCompanyIdFromSession();

    const sessions = await db.query.connections.findMany({
      where: and(
        eq(connections.companyId, companyId),
        eq(connections.connectionType, 'baileys')
      ),
      columns: {
        id: true,
        config_name: true,
        status: true,
        phone: true,
        lastConnected: true,
        isActive: true,
        createdAt: true,
      },
    });

    const sessionsWithRuntime = await Promise.all(
      sessions.map(async (s) => {
        const runtimeStatus = sessionManager.getSessionStatus(s.id);
        const hasAuth = await sessionManager.hasFilesystemAuth(s.id);
        
        let effectiveStatus = runtimeStatus || s.status || 'disconnected';
        
        if (s.status === 'connected' && !runtimeStatus) {
          if (!hasAuth) {
            effectiveStatus = 'disconnected';
            console.log(`[API] Session ${s.id} has no auth files, marking as disconnected`);
            db.update(connections)
              .set({ status: 'disconnected', isActive: false })
              .where(eq(connections.id, s.id))
              .execute()
              .catch((err) => console.error(`[API] Error updating session ${s.id} status:`, err));
          } else {
            effectiveStatus = 'connecting';
            console.log(`[API] Session ${s.id} has auth files but no runtime, showing as connecting`);
          }
        }
        
        return {
          id: s.id,
          name: s.config_name,
          status: effectiveStatus,
          runtimeStatus: runtimeStatus || 'none',
          hasAuth,
          phone: s.phone,
          lastConnected: s.lastConnected,
          isActive: s.isActive,
          createdAt: s.createdAt,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithRuntime,
    });
  } catch (error) {
    console.error('[API] Error fetching Baileys sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
