import { db } from '@/lib/db';
import { kanbanLeads } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { KanbanStage } from '@/lib/types';
import { NotificationService } from '@/lib/notifications/notification-service';
import { UserNotificationsService } from '@/lib/notifications/user-notifications.service';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';

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
    const previousStage = stages.find(s => s.id === lead.stageId);
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

    try {
      console.log(`[Webhook] Dispatching lead_stage_changed for lead ${leadId}`);
      await webhookDispatcher.dispatch(companyId, 'lead_stage_changed', {
        leadId: lead.id,
        previousStage: previousStage?.title || 'Unknown',
        newStage: newStage.title,
        contactName: lead.contact.name,
      });
    } catch (webhookError) {
      console.error('[Webhook] Error dispatching lead_stage_changed:', webhookError);
    }

    if (isMovingToWin) {
      NotificationService.safeNotify(
        NotificationService.notifyNewSale.bind(NotificationService),
        'MoveLeadToStage',
        companyId,
        {
          name: lead.contact.name,
          value: lead.value ? Number(lead.value) : undefined,
        }
      );

      try {
        console.log(`[Webhook] Dispatching sale_closed for lead ${leadId}`);
        await webhookDispatcher.dispatch(companyId, 'sale_closed', {
          leadId: lead.id,
          contactName: lead.contact.name,
          value: lead.value ? Number(lead.value) : undefined,
          closedAt: new Date().toISOString(),
        });
      } catch (webhookError) {
        console.error('[Webhook] Error dispatching sale_closed:', webhookError);
      }
    }

    const isMovingToMeetingScheduled = newStage.semanticType === 'meeting_scheduled';
    
    if (isMovingToMeetingScheduled) {
      try {
        console.log(`[UserNotification] Dispatching new_appointment for lead ${leadId}`);
        await UserNotificationsService.notifyLeadScheduled(
          companyId,
          lead.id,
          lead.contact.name,
          lead.board.id
        );
        
        console.log(`[Webhook] Dispatching meeting_scheduled for lead ${leadId}`);
        await webhookDispatcher.dispatch(companyId, 'meeting_scheduled', {
          leadId: lead.id,
          contactName: lead.contact.name,
          stageName: newStage.title,
          scheduledAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[MoveLeadToStage] Error notifying lead scheduled:', error);
      }
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
