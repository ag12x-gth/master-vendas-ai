import { db } from '@/lib/db';
import { kanbanLeads, kanbanBoards } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { KanbanStage } from '@/lib/types';
import { NotificationService } from '@/lib/notifications/notification-service';

export interface MoveLeadToStageParams {
  leadId: string;
  newStageId: string;
  companyId: string;
}

export interface MoveLeadToStageResult {
  success: boolean;
  error?: string;
  lead?: typeof kanbanLeads.$inferSelect;
}

export async function moveLeadToStage(
  params: MoveLeadToStageParams
): Promise<MoveLeadToStageResult> {
  const { leadId, newStageId, companyId } = params;

  try {
    const lead = await db.query.kanbanLeads.findFirst({
      where: eq(kanbanLeads.id, leadId),
      with: {
        contact: true,
        board: true,
      },
    });

    if (!lead) {
      return { success: false, error: 'Lead não encontrado' };
    }

    if (lead.board.companyId !== companyId) {
      return { success: false, error: 'Acesso negado' };
    }

    if (lead.stageId === newStageId) {
      return { success: true, lead };
    }

    const stages = lead.board.stages as KanbanStage[];
    const newStage = stages.find(s => s.id === newStageId);

    if (!newStage) {
      return { success: false, error: 'Estágio não encontrado' };
    }

    const isMovingToWin = newStage.type === 'WIN';

    await db.update(kanbanLeads)
      .set({
        stageId: newStageId,
        currentStage: newStage,
        lastStageChangeAt: new Date(),
      })
      .where(eq(kanbanLeads.id, leadId));

    if (isMovingToWin) {
      NotificationService.safeNotify(
        NotificationService.notifyNewSale,
        'MoveLeadToStage',
        companyId,
        {
          name: lead.contact.name,
          value: lead.value ? Number(lead.value) : undefined,
        }
      );
    }

    const updatedLead = await db.query.kanbanLeads.findFirst({
      where: eq(kanbanLeads.id, leadId),
      with: {
        contact: true,
        board: true,
      },
    });

    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error('[MoveLeadToStage] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
