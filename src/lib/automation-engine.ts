// src/lib/automation-engine.ts
'use server';

import { db } from './db';
import {
  automationRules,
  contactsToTags,
  contactsToContactLists,
  conversations,
  messages,
  automationLogs,
  connections,
} from './db/schema';
import { and, eq, or, isNull, sql } from 'drizzle-orm';
import type {
  AutomationCondition,
  AutomationAction,
  Contact,
  User,
  Message,
} from './types';
import { sendWhatsappTextMessage } from './facebookApiService';


type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
  companyId: string;
  conversationId: string;
  ruleId?: string | null;
  details?: Record<string, unknown>;
}

const MASKED_PLACEHOLDER = '***';
const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{4,5}[-.\s]?\d{4}\b/g;
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

function maskPII(text: string): string {
    if (!text) return text;
    return text
        .replace(cpfRegex, MASKED_PLACEHOLDER)
        .replace(phoneRegex, MASKED_PLACEHOLDER)
        .replace(emailRegex, MASKED_PLACEHOLDER);
}

// Função de logging tolerante a falhas
async function logAutomation(level: LogLevel, message: string, context: LogContext): Promise<void> {
    const maskedMessage = maskPII(message);
    const maskedDetails = context.details ? JSON.parse(maskPII(JSON.stringify(context.details))) : {};

    const logMessage = `[Automation|${level}|Conv:${context.conversationId}|Rule:${context.ruleId || 'N/A'}] ${maskedMessage}`;
    
    console.log(logMessage, maskedDetails);
    
    try {
        await db.insert(automationLogs).values({
            level,
            message: maskedMessage,
            companyId: context.companyId,
            conversationId: context.conversationId,
            ruleId: context.ruleId,
            details: maskedDetails,
        });
    } catch (dbError: any) {
        console.error(`[Automation Logger] FALHA AO GRAVAR LOG NO BANCO: ${dbError.message}`);
    }
}

// Tipo específico para o contexto do gatilho de automação
interface AutomationTriggerContext {
    companyId: string;
    conversation: (typeof conversations.$inferSelect) & { connection: (typeof connections.$inferSelect) };
    contact: Contact;
    message: Message;
}

async function checkCondition(condition: AutomationCondition, context: AutomationTriggerContext): Promise<boolean> {
    const { message } = context;

    switch (condition.type) {
        case 'message_content': {
            if (!message || typeof message.content !== 'string') return false;
            const content = message.content.toLowerCase();
            const value = String(condition.value).toLowerCase();
            switch (condition.operator) {
                case 'contains': return content.includes(value);
                case 'not_contains': return !content.includes(value);
                case 'equals': return content === value;
                case 'not_equals': return content !== value;
                default: return false;
            }
        }
        case 'contact_tag': {
            // Implementação futura
            return false;
        }
        default:
            await logAutomation('WARN', `Tipo de condição desconhecido: ${condition.type}`, { companyId: context.companyId, conversationId: context.conversation.id, ruleId: null, details: { condition } });
            return false;
    }
}

async function executeAction(action: AutomationAction, context: AutomationTriggerContext, ruleId: string): Promise<void> {
    const { contact, conversation } = context;
    const logContext: LogContext = { companyId: context.companyId, conversationId: context.conversation.id, ruleId, details: { action } };

    if (!conversation.connectionId) {
        await logAutomation('WARN', 'Ação ignorada: a conversa não tem ID de conexão.', logContext);
        return;
    }

    try {
        switch (action.type) {
            case 'send_message':
                if (!action.value) return;
                await sendWhatsappTextMessage({ connectionId: conversation.connectionId, to: contact.phone, text: action.value });
                break;
            case 'add_tag':
                 if (!action.value) return;
                await db.insert(contactsToTags).values({ contactId: contact.id, tagId: action.value }).onConflictDoNothing();
                break;
            case 'add_to_list':
                 if (!action.value) return;
                await db.insert(contactsToContactLists).values({ contactId: contact.id, listId: action.value }).onConflictDoNothing();
                break;
            case 'assign_user':
                 if (!action.value) return;
                await db.update(conversations).set({ assignedTo: action.value as User['id'] }).where(eq(conversations.id, conversation.id));
                break;
        }
        await logAutomation('INFO', `Ação executada com sucesso: ${action.type}`, logContext);
    } catch (error) {
        await logAutomation('ERROR', `Falha ao executar ação: ${action.type}`, { ...logContext, details: { action, errorMessage: (error as Error).message } });
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callExternalAIAgent(context: AutomationTriggerContext, personaId: string) {
    const { companyId, conversation, contact, message } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };
    
    await logAutomation('INFO', `Conversa roteada para o Agente de IA (Persona ID: ${personaId}).`, logContextBase);

    try {
        const response = await fetch('https://multidesk-master-ia-agentes.vs1kre.easypanel.host/personas/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message.content,
                company_id: companyId,
                persona_id: personaId,
                contact_id: contact.id,
                context: {
                    conversation_id: conversation.id
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || data.error || 'Erro desconhecido da API de IA.');
        }

        if (data.message) {
            const messageParts = data.message.split(/\n\s*\n/); // Divide por parágrafos
            for (const part of messageParts) {
                if (part.trim()) {
                     const sentMessage = await sendWhatsappTextMessage({
                        connectionId: conversation.connectionId!,
                        to: contact.phone,
                        text: part.trim(),
                    });
                     await db.insert(messages).values({
                        conversationId: conversation.id,
                        senderType: 'AI',
                        senderId: 'ai_agent',
                        content: part.trim(),
                        contentType: 'TEXT',
                        providerMessageId: (sentMessage as any).messages?.[0]?.id,
                    });
                    await sleep(1500); // Pausa entre as mensagens
                }
            }
        }
        return true;
    } catch (error) {
        await logAutomation('ERROR', `Falha ao comunicar com a API de Agentes: ${(error as Error).message}`, logContextBase);
        return false;
    }
}

export async function processIncomingMessageTrigger(conversationId: string, messageId: string): Promise<void> {
    console.log(`[Automation Engine] Gatilho recebido para a conversa ${conversationId} e mensagem ${messageId}`);
    
    const convoResult = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: { connection: true, contact: true }
    });

    if (!convoResult || !convoResult.companyId || !convoResult.contact || !convoResult.connection) {
        console.error(`[Automation Engine] Contexto inválido para a conversa ${conversationId}. A abortar.`);
        return;
    }

    const logContextBase = { companyId: convoResult.companyId, conversationId };
    
    // VERIFICAÇÃO #1: Roteamento para IA
    if (convoResult.aiActive && convoResult.connection.assignedPersonaId) {
        const message = await db.query.messages.findFirst({ where: eq(messages.id, messageId) });
        if (message) {
            const context: AutomationTriggerContext = {
                companyId: convoResult.companyId,
                conversation: convoResult as AutomationTriggerContext['conversation'],
                contact: convoResult.contact,
                message: message,
            };
            const aiResponded = await callExternalAIAgent(context, convoResult.connection.assignedPersonaId);
            if (aiResponded) return; // Se a IA respondeu, o fluxo termina aqui.
        }
    }
    
    // VERIFICAÇÃO #2: Regras de Automação (Executa se a IA não respondeu ou está inativa)
    const rules = await db.query.automationRules.findMany({
        where: and(
            eq(automationRules.companyId, convoResult.companyId),
            eq(automationRules.triggerEvent, 'new_message_received'),
            eq(automationRules.isActive, true),
            or(
                isNull(automationRules.connectionIds),
                sql`${convoResult.connection.id} = ANY(${automationRules.connectionIds})`
            )
        )
    });

    if (rules.length === 0) {
        await logAutomation('INFO', 'Nenhuma regra de automação ativa encontrada para esta mensagem.', logContextBase);
        return;
    }

    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) {
         await logAutomation('ERROR', 'Mensagem do gatilho não encontrada.', { ...logContextBase, details: { messageId } });
        return;
    }
    
    const context: AutomationTriggerContext = {
        companyId: convoResult.companyId,
        conversation: convoResult as AutomationTriggerContext['conversation'],
        contact: convoResult.contact,
        message: message,
    };

    for (const rule of rules) {
        const ruleLogContext = { ...logContextBase, ruleId: rule.id };
        let allConditionsMet = true;
        for (const condition of rule.conditions) {
            const conditionResult = await checkCondition(condition, context);
            if (!conditionResult) {
                allConditionsMet = false;
                break;
            }
        }
        
        if (allConditionsMet) {
            await logAutomation('INFO', `Regra "${rule.name}" CUMPRIDA. A executar ações...`, ruleLogContext);
            for (const action of rule.actions) {
                await executeAction(action, context, rule.id);
            }
        }
    }
}
