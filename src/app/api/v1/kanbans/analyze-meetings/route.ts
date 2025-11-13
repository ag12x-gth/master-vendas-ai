import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { conversations, messages, contacts, kanbanLeads, kanbanBoards } from '@/lib/db/schema';
import type { KanbanStage } from '@/lib/types';
import { getCompanyIdFromSession } from '@/app/actions';

interface AnalyzeRequest {
  boardId?: string;
  since?: string;
}

interface AnalyzeResult {
  stats: {
    conversationsAnalyzed: number;
    meetingsDetected: number;
    leadsMoved: number;
    leadsAlreadyCorrect: number;
    errors: number;
  };
  details: Array<{
    contactName: string;
    scheduledTime: string;
    moved: boolean;
    reason: string;
  }>;
}

async function detectMeetingInConversation(
  conversationMessages: Array<{ content: string; isUser: boolean }>
): Promise<{ detected: boolean; scheduledTime?: string; confidence: number }> {
  const conversationText = conversationMessages
    .map(m => m.content)
    .join('\n')
    .toLowerCase();

  let confidence = 0;
  const evidence: string[] = [];
  let scheduledTime: string | undefined;

  const strongSignals = [
    { pattern: /\b(agendar|marcar|combinar|confirmar).{0,40}(reuni[ãa]o|call|encontro|atendimento|liga[çc][ãa]o|workshop|sala|vaga)\b/i, weight: 30, name: 'Verbo de agendamento' },
    { pattern: /\b(reuni[ãa]o|call|encontro|atendimento|workshop|sala).{0,40}(agendad[oa]|marcad[oa]|confirmad[oa]|registrad[oa])\b/i, weight: 30, name: 'Confirmação' },
    { pattern: /\b(vamos fazer|pode ser|que tal|como fica|garantir sua vaga|confirmo seu acesso|vamos juntos)\b/i, weight: 25, name: 'Sugestão' },
    { pattern: /\b(fechado|perfeito|show|[óo]timo|combinado|confirmando).{0,25}(\d{1,2}[h:]?\d{0,2})/i, weight: 35, name: 'Fechamento + horário' },
    { pattern: /\best[áa] (confirmad[oa]|registrad[oa]|[óo]tim[oa]|perfeito)\b/i, weight: 25, name: 'Confirmação IA' },
  ];

  const mediumSignals = [
    { pattern: /\b(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo).{0,40}\d{1,2}[h:]?\d{0,2}/i, weight: 20, name: 'Dia + horário' },
    { pattern: /\b(amanh[ãa]|hoje|depois de amanh[ãa]).{0,40}\d{1,2}[h:]?\d{0,2}/i, weight: 20, name: 'Temporal + horário' },
    { pattern: /\b([aà]s?)\s+\d{1,2}[h:]?\d{0,2}/i, weight: 18, name: 'Às + horário' },
    { pattern: /\b(backup|alternativa|outra op[çc][ãa]o|mais um hor[áa]rio).{0,30}\d{1,2}[h:]?\d{0,2}/i, weight: 15, name: 'Horário backup' },
    { pattern: /\bentre\s+\d{1,2}h\s*[-e]\s*\d{1,2}h/i, weight: 12, name: 'Range de horário' },
  ];

  const weakSignals = [
    { pattern: /^\s*\d{1,2}([h:]?\d{2})?h?\s*$/im, weight: 35, name: 'Horário isolado' },
    { pattern: /^\s*\d{1,2}\s*$/im, weight: 30, name: 'Número isolado' },
    { pattern: /\b(confirmo|confirmado|confirmada|confirmar|confirmando)\b/i, weight: 15, name: 'Confirmar' },
    { pattern: /\b(workshop|sala secreta|sala|treinamento|curso)\b/i, weight: 10, name: 'Tipo de evento' },
  ];

  for (const signal of strongSignals) {
    if (signal.pattern.test(conversationText)) {
      confidence += signal.weight;
      evidence.push(signal.name);
    }
  }

  for (const signal of mediumSignals) {
    if (signal.pattern.test(conversationText)) {
      confidence += signal.weight;
      evidence.push(signal.name);
    }
  }

  for (const signal of weakSignals) {
    if (signal.pattern.test(conversationText)) {
      confidence += signal.weight;
      evidence.push(signal.name);
    }
  }

  const userMessages = conversationMessages.filter(m => m.isUser);
  const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

  if (lastUserMessage) {
    const lastUserContent = lastUserMessage.content.trim();
    const isIsolatedTime = /^\s*\d{1,2}([h:]?\d{2})?h?\s*$/i.test(lastUserContent);
    
    if (isIsolatedTime) {
      confidence += 20;
      evidence.push('Última mensagem do lead é horário isolado');
    }
  }

  const timePatterns = [
    { regex: /\b(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)[\s,-]*(?:feira)?[\s,]*(?:[aà]s?)?\s*(\d{1,2}(?:[h:]?\d{0,2}))/gi, type: 'day+time' },
    { regex: /\b(amanh[ãa]|hoje|depois de amanh[ãa])[\s,]*(?:[aà]s?)?\s*(\d{1,2}(?:[h:]?\d{0,2}))/gi, type: 'temporal+time' },
    { regex: /(?:fechado|confirmando|registrad[oa]|confirmad[oa])[\s:]*(\d{1,2}[h:]?\d{0,2})/gi, type: 'keyword+time' },
    { regex: /(?:[aà]s?)\s+(\d{1,2}[h:]?\d{0,2})/gi, type: 'as+time' },
    { regex: /\b(\d{1,2})[h:](\d{2})/gi, type: 'time_with_minutes' },
    { regex: /^\s*(\d{1,2})h?\s*$/gim, type: 'time_isolated' },
  ];

  const allMatches: Array<{ text: string; type: string }> = [];

  for (const { regex, type } of timePatterns) {
    const matches = Array.from(conversationText.matchAll(regex));
    for (const match of matches) {
      if (match[1] && match[2]) {
        if (type === 'time_with_minutes') {
          const hours = match[1];
          const minutes = match[2];
          allMatches.push({ text: `${hours}:${minutes}`, type });
        } else {
          const day = match[1];
          const time = match[2];
          allMatches.push({ text: `${day} ${time}`, type });
        }
      } else if (match[1]) {
        allMatches.push({ text: match[1], type });
      }
    }
  }

  if (allMatches.length > 0) {
    const lastMatch = allMatches[allMatches.length - 1];
    if (lastMatch) {
      let time = lastMatch.text.trim();
      
      if (/^\d{1,2}$/.test(time)) {
        scheduledTime = `${time}h`;
      } else if (/^\d{1,2}:\d{2}$/.test(time)) {
        scheduledTime = `${time}h`;
      } else {
        scheduledTime = time.replace(/h?s?$/i, 'h').trim();
      }
    }
  }

  const detected = confidence >= 50;
  return { detected, scheduledTime, confidence };
}

async function runMeetingBackfill(
  companyId: string,
  options: { boardId?: string; since?: Date; batchSize?: number }
): Promise<AnalyzeResult> {
  const { boardId, since, batchSize = 300 } = options;
  
  const stats = {
    conversationsAnalyzed: 0,
    meetingsDetected: 0,
    leadsMoved: 0,
    leadsAlreadyCorrect: 0,
    errors: 0,
  };
  
  const details: AnalyzeResult['details'] = [];

  try {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const conversationsQuery = db
        .select({
          id: conversations.id,
          contactId: conversations.contactId,
          companyId: conversations.companyId,
        })
        .from(conversations)
        .innerJoin(contacts, eq(conversations.contactId, contacts.id))
        .where(
          and(
            eq(conversations.companyId, companyId),
            since ? gte(conversations.updatedAt, since) : undefined
          )
        )
        .orderBy(desc(conversations.updatedAt))
        .limit(batchSize)
        .offset(offset);

      const conversationsList = await conversationsQuery;
      
      if (conversationsList.length === 0 || conversationsList.length < batchSize) {
        hasMore = false;
      }

      for (const conv of conversationsList) {
        try {
          stats.conversationsAnalyzed++;

        const rawMessages = await db
          .select({
            content: messages.content,
            senderType: messages.senderType,
            createdAt: messages.sentAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.sentAt))
          .limit(20);

        if (rawMessages.length === 0) continue;

        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, conv.contactId),
        });

        if (!contact) continue;

        const conversationMessages = rawMessages.map(msg => ({
          content: msg.content,
          isUser: msg.senderType === 'USER',
        }));

        const messagesForAnalysis = conversationMessages.reverse();
        const detection = await detectMeetingInConversation(messagesForAnalysis);

        if (detection.detected && detection.scheduledTime) {
          stats.meetingsDetected++;

          const activeLead = await db.query.kanbanLeads.findFirst({
            where: and(
              eq(kanbanLeads.contactId, contact.id),
              boardId ? eq(kanbanLeads.boardId, boardId) : undefined
            ),
            with: { board: true },
            orderBy: (kanbanLeads, { desc }) => [desc(kanbanLeads.createdAt)],
          });

          if (!activeLead || activeLead.board.companyId !== companyId) {
            details.push({
              contactName: contact.name,
              scheduledTime: detection.scheduledTime,
              moved: false,
              reason: !activeLead ? 'Lead não encontrado no Kanban' : 'Lead pertence a outra empresa',
            });
            continue;
          }

          const stages = activeLead.board.stages as KanbanStage[];
          const targetStage = stages.find(s => s.semanticType === 'meeting_scheduled');

          if (!targetStage) {
            details.push({
              contactName: contact.name,
              scheduledTime: detection.scheduledTime,
              moved: false,
              reason: 'Estágio "meeting_scheduled" não encontrado no funil',
            });
            continue;
          }

          if (activeLead.stageId === targetStage.id) {
            stats.leadsAlreadyCorrect++;
            
            const normalizedNote = `📅 Reunião agendada: ${detection.scheduledTime}`;
            const currentNotes = activeLead.notes || '';
            const hasExistingMeetingNote = /📅 Reunião agendada:/i.test(currentNotes);
            
            let updatedNotes: string;
            if (hasExistingMeetingNote) {
              updatedNotes = currentNotes.replace(/📅 Reunião agendada:.*?(\n|$)/i, `${normalizedNote}\n`);
            } else {
              updatedNotes = currentNotes ? `${normalizedNote}\n\n${currentNotes}` : normalizedNote;
            }
            
            await db.update(kanbanLeads)
              .set({ notes: updatedNotes.trim() })
              .where(eq(kanbanLeads.id, activeLead.id));
            
            details.push({
              contactName: contact.name,
              scheduledTime: detection.scheduledTime,
              moved: false,
              reason: 'Lead já estava no estágio correto, horário atualizado nas notas',
            });
            continue;
          }

          if (targetStage.type === 'WIN' || targetStage.type === 'LOSS') {
            details.push({
              contactName: contact.name,
              scheduledTime: detection.scheduledTime,
              moved: false,
              reason: 'Estágio de destino é final (WIN/LOSS), movimentação bloqueada',
            });
            continue;
          }

          const normalizedNote = `📅 Reunião agendada: ${detection.scheduledTime}`;
          const currentNotes = activeLead.notes || '';
          const hasExistingMeetingNote = /📅 Reunião agendada:/i.test(currentNotes);
          
          let updatedNotes: string;
          if (hasExistingMeetingNote) {
            updatedNotes = currentNotes.replace(/📅 Reunião agendada:.*?(\n|$)/i, `${normalizedNote}\n`);
          } else {
            updatedNotes = currentNotes ? `${normalizedNote}\n\n${currentNotes}` : normalizedNote;
          }

          await db.update(kanbanLeads)
            .set({ 
              stageId: targetStage.id,
              notes: updatedNotes.trim(),
            })
            .where(eq(kanbanLeads.id, activeLead.id));

          stats.leadsMoved++;
          details.push({
            contactName: contact.name,
            scheduledTime: detection.scheduledTime,
            moved: true,
            reason: `Movido para "${targetStage.title}"`,
          });
        }
        } catch (error) {
          stats.errors++;
          console.error(`[Analyze Meetings] Erro ao processar conversa ${conv.id}:`, error);
        }
      }
      
      offset += batchSize;
    }
  } catch (error) {
    console.error('[Analyze Meetings] Erro geral:', error);
    throw error;
  }

  return { stats, details };
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();

    const body: AnalyzeRequest = await request.json().catch(() => ({}));
    const { boardId, since } = body;

    const sinceDate = since ? new Date(since) : undefined;

    const result = await runMeetingBackfill(companyId, {
      boardId,
      since: sinceDate,
      batchSize: 300,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Analyze Meetings API] Erro:', error);
    
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao analisar conversas', message: (error as Error).message },
      { status: 500 }
    );
  }
}
