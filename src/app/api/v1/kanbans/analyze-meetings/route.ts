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
    { pattern: /\b(agendar|marcar|combinar|confirmar).{0,30}(reuni[ãa]o|call|encontro|atendimento|liga[çc][ãa]o)\b/, weight: 30, name: 'Verbo de agendamento + substantivo' },
    { pattern: /\b(reuni[ãa]o|call|encontro|atendimento).{0,30}(agendad[oa]|marcad[oa]|confirmad[oa])\b/, weight: 30, name: 'Substantivo + participio passado' },
    { pattern: /\b(vamos fazer|pode ser|que tal|como fica).{0,30}(reuni[ãa]o|call|encontro)\b/, weight: 25, name: 'Sugestão de reunião' },
  ];

  const mediumSignals = [
    { pattern: /\b(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo).{0,30}\d{1,2}h\d{0,2}\b/, weight: 20, name: 'Dia da semana + horário' },
    { pattern: /\b(amanh[ãa]|hoje|depois).{0,30}\d{1,2}h\d{0,2}\b/, weight: 15, name: 'Referência temporal + horário' },
    { pattern: /\b(confirmo|confirmado|confirmada|confirmar)\b/, weight: 15, name: 'Variações de confirmar' },
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

  const weekdayExtractPattern = '(segunda|ter[cç]a(?:[\\s-]?feira)?|quarta(?:[\\s-]?feira)?|quinta(?:[\\s-]?feira)?|sexta(?:[\\s-]?feira)?|s[áa]bado|domingo)';
  
  const dayFirstPattern = new RegExp(`\\b${weekdayExtractPattern}[\\s,]*(?:[aà]s?)?\\s*(\\d{1,2}(?:h(?:\\d{1,2})?|: ?\\d{2})(?:hs?|min)?)\\b`, 'gi');
  const dayFirstMatches = Array.from(conversationText.matchAll(dayFirstPattern));
  
  if (dayFirstMatches.length > 0) {
    const lastMatch = dayFirstMatches[dayFirstMatches.length - 1];
    if (lastMatch && lastMatch[1] && lastMatch[2]) {
      const dayName = lastMatch[1].replace(/[\s-]?feira/i, '').trim();
      scheduledTime = `${dayName} às ${lastMatch[2].replace(/hs?$/, 'h').trim()}`;
    }
  }

  const detected = confidence >= 60;
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

        const conversationMessages = await db
          .select({
            content: messages.content,
            isUser: messages.isUser,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(20);

        if (conversationMessages.length === 0) continue;

        const contact = await db.query.contacts.findFirst({
          where: eq(contacts.id, conv.contactId),
        });

        if (!contact) continue;

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
