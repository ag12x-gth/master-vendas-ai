import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationAgents, notificationAgentGroups, connections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

// GET - Listar todos os agentes de notificação
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const agents = await db.query.notificationAgents.findMany({
      where: eq(notificationAgents.companyId, companyId),
      with: {
        connection: {
          columns: {
            id: true,
            config_name: true,
            connectionType: true,
            status: true,
          },
        },
        groups: true,
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('[NotificationAgents] GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agentes de notificação' },
      { status: 500 }
    );
  }
}

// POST - Criar novo agente de notificação
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      connectionId, 
      name, 
      description, 
      groupJids, 
      enabledNotifications,
      scheduleTime,
      timezone,
    } = body;

    // Validar campos obrigatórios
    if (!connectionId || !name || !groupJids || groupJids.length === 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: connectionId, name, groupJids' },
        { status: 400 }
      );
    }

    // Validar que a conexão existe, pertence à empresa e é tipo Baileys
    const connection = await db.query.connections.findFirst({
      where: and(
        eq(connections.id, connectionId),
        eq(connections.companyId, companyId)
      ),
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Conexão não encontrada' },
        { status: 404 }
      );
    }

    if (connection.connectionType !== 'baileys') {
      return NextResponse.json(
        { error: 'Apenas conexões Baileys são suportadas para agentes de notificação' },
        { status: 400 }
      );
    }

    // Criar agente
    const [newAgent] = await db.insert(notificationAgents).values({
      companyId,
      connectionId,
      name,
      description: description || null,
      enabledNotifications: enabledNotifications || {
        dailyReport: false,
        weeklyReport: false,
        biweeklyReport: false,
        monthlyReport: false,
        biannualReport: false,
        newMeeting: false,
        newSale: false,
        campaignSent: false,
      },
      scheduleTime: scheduleTime || '09:00',
      timezone: timezone || 'America/Sao_Paulo',
      isActive: true,
    }).returning();

    // Criar grupos associados
    if (newAgent && groupJids && groupJids.length > 0) {
      await db.insert(notificationAgentGroups).values(
        groupJids.map((jid: string) => ({
          agentId: newAgent.id,
          groupJid: jid,
          isActive: true,
        }))
      );
    }

    // Retornar agente com grupos
    if (!newAgent) {
      return NextResponse.json(
        { error: 'Erro ao criar agente' },
        { status: 500 }
      );
    }

    const agentWithGroups = await db.query.notificationAgents.findFirst({
      where: eq(notificationAgents.id, newAgent.id),
      with: {
        groups: true,
        connection: true,
      },
    });

    return NextResponse.json(agentWithGroups, { status: 201 });
  } catch (error) {
    console.error('[NotificationAgents] POST error:', error);
    
    // Tratamento de unique constraint violation
    if ((error as any).code === '23505') {
      return NextResponse.json(
        { error: 'Já existe um agente com este nome para esta empresa' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erro ao criar agente de notificação' },
      { status: 500 }
    );
  }
}
