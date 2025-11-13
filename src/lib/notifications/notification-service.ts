import { db } from '@/lib/db';
import { 
  notificationAgents, 
  notificationAgentGroups, 
  notificationLogs,
  kanbanLeads,
  kanbanBoards,
  contacts,
  campaigns,
  conversations,
  messages
} from '@/lib/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { sessionManager as baileysSessionManager } from '@/services/baileys-session-manager';

interface NotificationStats {
  agendamentos: number;
  vendas: number;
  vendasValor: number;
  conversas: number;
  campanhas: number;
}

interface LeadData {
  name: string;
  scheduledTime?: string;
  stageTitle?: string;
  value?: number;
  product?: string;
}

interface CampaignData {
  name: string;
  channel: string;
  sent: number;
  delivered: number;
  rate: number;
}

export class NotificationService {
  /**
   * Envia notificação de novo agendamento
   */
  static async notifyNewMeeting(
    companyId: string,
    leadData: LeadData,
    scheduledTime: string
  ): Promise<void> {
    const agents = await this.getActiveAgents(companyId, 'newMeeting');
    
    const message = this.formatNewMeetingMessage(leadData, scheduledTime);
    
    await this.sendToAgents(agents, message, 'new_meeting', { leadData, scheduledTime });
  }

  /**
   * Envia notificação de nova venda
   */
  static async notifyNewSale(
    companyId: string,
    leadData: LeadData
  ): Promise<void> {
    const agents = await this.getActiveAgents(companyId, 'newSale');
    
    const message = this.formatNewSaleMessage(leadData);
    
    await this.sendToAgents(agents, message, 'new_sale', { leadData });
  }

  /**
   * Envia notificação de campanha enviada
   */
  static async notifyCampaignSent(
    companyId: string,
    campaignData: CampaignData
  ): Promise<void> {
    const agents = await this.getActiveAgents(companyId, 'campaignSent');
    
    const message = this.formatCampaignMessage(campaignData);
    
    await this.sendToAgents(agents, message, 'campaign_sent', { campaignData });
  }

  /**
   * Gera e envia relatório periódico
   */
  static async sendScheduledReport(
    agentId: string,
    period: 'daily_report' | 'weekly_report' | 'biweekly_report' | 'monthly_report' | 'biannual_report'
  ): Promise<void> {
    const agent = await db.query.notificationAgents.findFirst({
      where: eq(notificationAgents.id, agentId),
      with: {
        groups: true,
        company: true,
      },
    });

    if (!agent || !agent.isActive) {
      return;
    }

    const days = this.getPeriodDays(period);
    const stats = await this.getStatsForPeriod(agent.companyId, days);
    
    const message = this.formatReportMessage(period, days, stats);
    
    const activeGroups = agent.groups.filter(g => g.isActive);
    
    for (const group of activeGroups) {
      await this.sendMessage(
        agent.id,
        agent.connectionId,
        group.groupJid,
        message,
        period,
        { period, days, stats }
      );
    }

    // Atualizar lastSentAt
    const lastSentAt = agent.lastSentAt || {};
    lastSentAt[period] = new Date().toISOString();
    
    await db.update(notificationAgents)
      .set({ lastSentAt })
      .where(eq(notificationAgents.id, agentId));
  }

  /**
   * Obtém estatísticas para um período
   */
  static async getStatsForPeriod(
    companyId: string,
    days: number
  ): Promise<NotificationStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Contar agendamentos - leads com semanticType 'meeting_scheduled' que mudaram no período
    const agendamentosResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(kanbanLeads)
      .innerJoin(kanbanBoards, eq(kanbanLeads.boardId, kanbanBoards.id))
      .where(
        and(
          eq(kanbanBoards.companyId, companyId),
          gte(kanbanLeads.lastStageChangeAt, since),
          sql`${kanbanLeads.currentStage}->>'semanticType' = 'meeting_scheduled'`
        )
      );

    // Contar vendas - leads em estágios WIN que mudaram no período
    const vendasResult = await db
      .select({ 
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(sum(CAST(${kanbanLeads.value} AS DECIMAL)), 0)`
      })
      .from(kanbanLeads)
      .innerJoin(kanbanBoards, eq(kanbanLeads.boardId, kanbanBoards.id))
      .where(
        and(
          eq(kanbanBoards.companyId, companyId),
          gte(kanbanLeads.lastStageChangeAt, since),
          sql`${kanbanLeads.currentStage}->>'type' = 'WIN'`
        )
      );

    // Contar conversas
    const conversasResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        and(
          eq(conversations.companyId, companyId),
          gte(conversations.updatedAt, since)
        )
      );

    // Contar campanhas
    const campanhasResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.companyId, companyId),
          gte(campaigns.createdAt, since)
        )
      );

    return {
      agendamentos: agendamentosResult[0]?.count || 0,
      vendas: vendasResult[0]?.count || 0,
      vendasValor: Number(vendasResult[0]?.total || 0),
      conversas: conversasResult[0]?.count || 0,
      campanhas: campanhasResult[0]?.count || 0,
    };
  }

  /**
   * Envia mensagem para grupos de agentes
   */
  private static async sendToAgents(
    agents: Array<{ id: string; connectionId: string; groups: Array<{ groupJid: string; isActive: boolean }> }>,
    message: string,
    type: 'new_meeting' | 'new_sale' | 'campaign_sent',
    metadata: any
  ): Promise<void> {
    for (const agent of agents) {
      const activeGroups = agent.groups.filter(g => g.isActive);
      
      for (const group of activeGroups) {
        await this.sendMessage(
          agent.id,
          agent.connectionId,
          group.groupJid,
          message,
          type,
          metadata
        );
      }
    }
  }

  /**
   * Envia mensagem via Baileys e registra log
   */
  private static async sendMessage(
    agentId: string,
    connectionId: string,
    groupJid: string,
    message: string,
    type: any,
    metadata: any
  ): Promise<void> {
    const logData = {
      agentId,
      type,
      groupJid,
      message,
      status: 'pending' as const,
      metadata,
      retryCount: 0,
    };

    try {
      // Enviar mensagem via session manager
      const messageId = await baileysSessionManager.sendMessage(
        connectionId,
        groupJid,
        { text: message }
      );

      if (!messageId) {
        throw new Error(`Falha ao enviar mensagem para grupo ${groupJid}`);
      }

      // Registrar sucesso
      await db.insert(notificationLogs).values({
        ...logData,
        status: 'sent',
      });
    } catch (error) {
      console.error('[NotificationService] Erro ao enviar mensagem:', error);
      
      // Registrar falha
      await db.insert(notificationLogs).values({
        ...logData,
        status: 'failed',
        failureReason: (error as Error).message,
        errorCode: 'SEND_ERROR',
      });
    }
  }

  /**
   * Obtém agentes ativos com notificação habilitada
   */
  private static async getActiveAgents(
    companyId: string,
    notificationType: keyof NotificationAgents['enabledNotifications']
  ) {
    const agents = await db.query.notificationAgents.findMany({
      where: and(
        eq(notificationAgents.companyId, companyId),
        eq(notificationAgents.isActive, true)
      ),
      with: {
        groups: true,
      },
    });

    return agents.filter(agent => 
      agent.enabledNotifications?.[notificationType] === true
    );
  }

  /**
   * Formata mensagem de novo agendamento
   */
  private static formatNewMeetingMessage(leadData: LeadData, scheduledTime: string): string {
    return `🎯 *NOVO AGENDAMENTO*

Lead: ${leadData.name}
Horário: ${scheduledTime}
${leadData.stageTitle ? `Estágio: ${leadData.stageTitle}` : ''}

#agendamento #vendas`;
  }

  /**
   * Formata mensagem de nova venda
   */
  private static formatNewSaleMessage(leadData: LeadData): string {
    const valorFormatado = leadData.value 
      ? `R$ ${leadData.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'N/A';

    return `💰 *NOVA VENDA CONFIRMADA*

Cliente: ${leadData.name}
Valor: ${valorFormatado}
${leadData.product ? `Produto: ${leadData.product}` : ''}

#venda #sucesso`;
  }

  /**
   * Formata mensagem de campanha enviada
   */
  private static formatCampaignMessage(campaignData: CampaignData): string {
    return `📢 *CAMPANHA ENVIADA*

Nome: ${campaignData.name}
Canal: ${campaignData.channel}
Enviadas: ${campaignData.sent}
Entregues: ${campaignData.delivered}
Taxa: ${campaignData.rate.toFixed(1)}%

#campanha #${campaignData.channel.toLowerCase()}`;
  }

  /**
   * Formata mensagem de relatório periódico
   */
  private static formatReportMessage(
    period: string,
    days: number,
    stats: NotificationStats
  ): string {
    const periodLabel = this.getPeriodLabel(period);
    const today = new Date().toLocaleDateString('pt-BR');

    const valorFormatado = stats.vendasValor
      ? `R$ ${stats.vendasValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'R$ 0,00';

    return `📊 *${periodLabel.toUpperCase()}*
Data: ${today}

🎯 Agendamentos: ${stats.agendamentos}
💰 Vendas: ${stats.vendas} (${valorFormatado})
📱 Conversas: ${stats.conversas}
📢 Campanhas: ${stats.campanhas}

#relatorio #${period}`;
  }

  /**
   * Converte tipo de período em número de dias
   */
  private static getPeriodDays(period: string): number {
    const map: Record<string, number> = {
      daily_report: 1,
      weekly_report: 7,
      biweekly_report: 15,
      monthly_report: 30,
      biannual_report: 180,
    };
    return map[period] || 1;
  }

  /**
   * Converte tipo de período em label
   */
  private static getPeriodLabel(period: string): string {
    const map: Record<string, string> = {
      daily_report: 'Relatório do Dia',
      weekly_report: 'Relatório Semanal',
      biweekly_report: 'Relatório Quinzenal',
      monthly_report: 'Relatório Mensal',
      biannual_report: 'Relatório Semestral',
    };
    return map[period] || 'Relatório';
  }
}

// Type helper para enabledNotifications
type NotificationAgents = typeof notificationAgents.$inferSelect;
