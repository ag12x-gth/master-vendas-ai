import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, connections, kanbanLeads, kanbanStagePersonas, aiPersonas } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const companyId = await getCompanyIdFromSession();
    const { conversationId } = params;

    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.companyId, companyId)
      ),
      with: {
        connection: true,
        contact: true
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    let effectivePersonaId: string | null = null;
    let source: 'stage' | 'funnel' | 'connection' | 'conversation' | 'none' = 'none';
    let details: any = {};

    const contactType = conversation.contactType || 'PASSIVE';

    const activeLead = await db.query.kanbanLeads.findFirst({
      where: eq(kanbanLeads.contactId, conversation.contact.id),
      with: { board: true },
      orderBy: (kanbanLeads, { desc }) => [desc(kanbanLeads.createdAt)]
    });

    if (activeLead) {
      const stageConfig = await db.query.kanbanStagePersonas.findFirst({
        where: and(
          eq(kanbanStagePersonas.boardId, activeLead.boardId),
          eq(kanbanStagePersonas.stageId, activeLead.stageId)
        )
      });

      if (stageConfig) {
        const personaId = contactType === 'ACTIVE' 
          ? stageConfig.activePersonaId 
          : stageConfig.passivePersonaId;

        if (personaId) {
          effectivePersonaId = personaId;
          source = 'stage';
          details = {
            boardName: activeLead.board.name,
            stageId: activeLead.stageId,
            contactType
          };
        }
      }

      if (!effectivePersonaId) {
        const boardConfig = await db.query.kanbanStagePersonas.findFirst({
          where: and(
            eq(kanbanStagePersonas.boardId, activeLead.boardId),
            isNull(kanbanStagePersonas.stageId)
          )
        });

        if (boardConfig) {
          const personaId = contactType === 'ACTIVE' 
            ? boardConfig.activePersonaId 
            : boardConfig.passivePersonaId;

          if (personaId) {
            effectivePersonaId = personaId;
            source = 'funnel';
            details = {
              boardName: activeLead.board.name,
              contactType
            };
          }
        }
      }
    }

    if (!effectivePersonaId && conversation.connection?.assignedPersonaId) {
      effectivePersonaId = conversation.connection.assignedPersonaId;
      source = 'connection';
      details = { connectionName: conversation.connection.config_name };
    }

    if (!effectivePersonaId && conversation.assignedPersonaId) {
      effectivePersonaId = conversation.assignedPersonaId;
      source = 'conversation';
    }

    let personaInfo = null;
    if (effectivePersonaId) {
      personaInfo = await db.query.aiPersonas.findFirst({
        where: eq(aiPersonas.id, effectivePersonaId)
      });
    }

    return NextResponse.json({
      effectivePersonaId,
      source,
      details,
      persona: personaInfo ? {
        id: personaInfo.id,
        name: personaInfo.name,
        provider: personaInfo.provider
      } : null,
      manualPersonaId: conversation.assignedPersonaId
    });

  } catch (error) {
    console.error('Erro ao buscar agente efetivo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agente efetivo' },
      { status: 500 }
    );
  }
}
