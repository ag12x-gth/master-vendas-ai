import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/services/baileys-session-manager';
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

    const [connection] = await db
      .insert(connections)
      .values({
        companyId,
        config_name: name,
        connectionType: 'baileys',
        status: 'connecting',
        isActive: false,
      })
      .returning();

    if (connection) {
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

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.config_name,
        status: s.status || 'disconnected',
        phone: s.phone,
        lastConnected: s.lastConnected,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('[API] Error fetching Baileys sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
