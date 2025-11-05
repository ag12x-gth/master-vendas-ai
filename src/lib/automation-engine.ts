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
  aiPersonas,
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
import OpenAI from 'openai';
import {
  detectLanguage,
  getPersonaPromptSections,
  assembleDynamicPrompt,
  estimateTokenCount,
} from './prompt-utils';
import { kanbanLeads, kanbanBoards, kanbanStagePersonas } from './db';


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
const apiKeyRegex = /\b(?:sk-[a-zA-Z0-9-]+|Bearer\s+[a-zA-Z0-9\-_.]+|api[_-]?key[:\s=]+[a-zA-Z0-9\-_.]+|token[:\s=]+[a-zA-Z0-9\-_.]+)\b/gi;
const passwordRegex = /(?:password|senha|pass)[:\s=]+[^\s]+/gi;

function maskPII(text: string): string {
    if (!text) return text;
    return text
        .replace(cpfRegex, MASKED_PLACEHOLDER)
        .replace(phoneRegex, MASKED_PLACEHOLDER)
        .replace(emailRegex, MASKED_PLACEHOLDER)
        .replace(apiKeyRegex, '***REDACTED***')
        .replace(passwordRegex, 'password=***REDACTED***');
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
        const sanitizedError = maskPII((error as Error).message);
        await logAutomation('ERROR', `Falha ao executar ação: ${action.type}`, { ...logContext, details: { action, errorMessage: sanitizedError } });
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function selectIntelligentPersona(
    context: AutomationTriggerContext,
    defaultPersonaId: string | null
): Promise<string | null> {
    const { contact, conversation, companyId } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };

    try {
        const activeLead = await db.query.kanbanLeads.findFirst({
            where: and(
                eq(kanbanLeads.contactId, contact.id),
            ),
            with: {
                board: true
            },
            orderBy: (kanbanLeads, { desc }) => [desc(kanbanLeads.createdAt)],
        });

        const contactType = conversation.contactType || 'PASSIVE';

        if (activeLead) {
            await logAutomation('INFO', `Lead encontrado no funil "${activeLead.board.name}" (Tipo: ${activeLead.board.funnelType || 'GENERAL'}, Estágio: ${activeLead.stageId})`, logContextBase);

            let stagePersonaConfig = await db.query.kanbanStagePersonas.findFirst({
                where: and(
                    eq(kanbanStagePersonas.boardId, activeLead.boardId),
                    eq(kanbanStagePersonas.stageId, activeLead.stageId)
                )
            });

            if (stagePersonaConfig) {
                const selectedPersonaId = contactType === 'ACTIVE' 
                    ? stagePersonaConfig.activePersonaId 
                    : stagePersonaConfig.passivePersonaId;

                if (selectedPersonaId) {
                    await logAutomation('INFO', `✅ [Prioridade 1] Agente IA selecionado (nível estágio): Funil="${activeLead.board.name}", Estágio="${activeLead.stageId}", Tipo="${contactType}"`, logContextBase);
                    return selectedPersonaId;
                }
            }

            const boardPersonaConfig = await db.query.kanbanStagePersonas.findFirst({
                where: and(
                    eq(kanbanStagePersonas.boardId, activeLead.boardId),
                    isNull(kanbanStagePersonas.stageId)
                )
            });

            if (boardPersonaConfig) {
                const selectedPersonaId = contactType === 'ACTIVE' 
                    ? boardPersonaConfig.activePersonaId 
                    : boardPersonaConfig.passivePersonaId;

                if (selectedPersonaId) {
                    await logAutomation('INFO', `✅ [Prioridade 2] Agente IA selecionado (nível funil): Funil="${activeLead.board.name}", Tipo="${contactType}"`, logContextBase);
                    return selectedPersonaId;
                }
            }
        } else {
            await logAutomation('INFO', `Contato sem lead ativo no Kanban. Seguindo hierarquia de fallback...`, logContextBase);
        }

        if (defaultPersonaId) {
            await logAutomation('INFO', `✅ [Prioridade 3] Usando agente padrão da conexão WhatsApp`, logContextBase);
            return defaultPersonaId;
        }

        if (conversation.assignedPersonaId) {
            await logAutomation('INFO', `✅ [Prioridade 4] Usando agente configurado manualmente na conversa (último fallback)`, logContextBase);
            return conversation.assignedPersonaId;
        }

        await logAutomation('INFO', `⚠️ [Prioridade 5] Nenhum agente configurado. Sistema usará "Agente Genérico" (resposta básica).`, logContextBase);
        return null;

    } catch (error) {
        await logAutomation('ERROR', `Erro ao selecionar agente IA inteligente: ${(error as Error).message}`, logContextBase);
        
        if (defaultPersonaId) return defaultPersonaId;
        if (conversation.assignedPersonaId) return conversation.assignedPersonaId;
        return null;
    }
}

async function callExternalAIAgent(context: AutomationTriggerContext, personaId: string) {
    const { companyId, conversation, contact, message } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };
    
    await logAutomation('INFO', `Conversa roteada para o Agente de IA (Persona ID: ${personaId}).`, logContextBase);

    try {
        // Buscar a persona do banco de dados
        const persona = await db.query.aiPersonas.findFirst({
            where: eq(aiPersonas.id, personaId)
        });

        if (!persona) {
            throw new Error(`Persona ${personaId} não encontrada no banco de dados.`);
        }

        await logAutomation('INFO', `Usando persona: ${persona.name} (Provider: ${persona.provider}, Model: ${persona.model})`, logContextBase);

        // Verificar se a persona usa OpenAI
        if (persona.provider !== 'OPENAI') {
            throw new Error(`Persona usa provider ${persona.provider}, mas apenas OPENAI é suportado nesta função.`);
        }

        // ✅ FIX: Buscar mensagens mais recentes primeiro (DESC) e reverter para ordem cronológica
        // Isso garante que pegamos as mensagens MAIS NOVAS, não as antigas
        const allMessages = await db.query.messages.findMany({
            where: eq(messages.conversationId, conversation.id),
            orderBy: (messages, { desc }) => [desc(messages.sentAt)],
            limit: 20  // Buscar mais mensagens para garantir que temos contexto suficiente
        });

        // Reverter para ordem cronológica (mais antiga → mais recente)
        const chronologicalMessages = allMessages.reverse();
        
        // Garantir que a mensagem atual (trigger) está incluída no histórico
        // Se não estiver, adicionar explicitamente
        const triggerMessageExists = chronologicalMessages.some(msg => msg.id === message.id);
        if (!triggerMessageExists) {
            chronologicalMessages.push(message);
            await logAutomation('INFO', `Mensagem atual (trigger) adicionada explicitamente ao contexto`, logContextBase);
        }

        // Pegar apenas as últimas 10 mensagens para enviar ao LLM (evitar excesso de tokens)
        const recentMessages = chronologicalMessages.slice(-10);
        
        await logAutomation('INFO', `Incluindo ${recentMessages.length} mensagens do histórico (incluindo mensagem atual)`, logContextBase);

        // SISTEMA DE PROMPTS DINÂMICOS (RAG)
        // 1. Detectar idioma da mensagem atual
        const detectedLanguage = detectLanguage(message.content);
        await logAutomation('INFO', `Idioma detectado: ${detectedLanguage}`, logContextBase);

        // 2. Buscar seções relevantes do prompt
        let systemPrompt: string;
        
        // Verificar se o agente está configurado para usar RAG
        if (persona.useRag) {
            const promptSections = await getPersonaPromptSections(personaId, detectedLanguage);
            
            if (promptSections.length > 0) {
                // Se existem seções e RAG está ativo, usar prompts modulares
                const contextInfo = `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contact.name || 'Cliente'}\n- Telefone: ${contact.phone}`;
                systemPrompt = assembleDynamicPrompt(promptSections, contextInfo);
                await logAutomation('INFO', `Sistema RAG ativo: ${promptSections.length} seções carregadas (${estimateTokenCount(systemPrompt)} tokens estimados)`, logContextBase);
            } else {
                // RAG ativo mas sem seções - avisar e usar fallback
                systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um assistente virtual inteligente de atendimento ao cliente via WhatsApp.`;
                systemPrompt += `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contact.name || 'Cliente'}\n- Telefone: ${contact.phone}`;
                await logAutomation('WARN', `RAG ativo mas sem seções encontradas. Usando systemPrompt tradicional (${estimateTokenCount(systemPrompt)} tokens estimados)`, logContextBase);
            }
        } else {
            // RAG desativado: usar systemPrompt tradicional da tabela ai_personas
            systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um assistente virtual inteligente de atendimento ao cliente via WhatsApp.`;
            systemPrompt += `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contact.name || 'Cliente'}\n- Telefone: ${contact.phone}`;
            await logAutomation('INFO', `RAG desativado: usando systemPrompt tradicional (${estimateTokenCount(systemPrompt)} tokens estimados)`, logContextBase);
        }

        // Construir histórico de conversa para OpenAI
        const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];

        // Adicionar histórico COMPLETO da conversa (usuário + IA) para manter contexto
        for (const msg of recentMessages) {
            // Determinar o role com base em quem enviou a mensagem
            let role: 'user' | 'assistant';
            
            if (msg.senderType === 'CONTACT' || msg.senderType === 'USER') {
                role = 'user';
            } else if (msg.senderType === 'AI' || msg.senderType === 'SYSTEM') {
                role = 'assistant';
            } else {
                // Mensagens de outros tipos (BUSINESS, etc) são tratadas como usuário
                role = 'user';
            }
            
            chatMessages.push({
                role: role,
                content: msg.content
            });
        }

        // Configurar OpenAI (prioriza openai_apikey_gpt_padrao que contém a chave correta)
        const apiKey = process.env.openai_apikey_gpt_padrao || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('Chave API do OpenAI não configurada. Configure openai_apikey_gpt_padrao ou OPENAI_API_KEY nos Secrets.');
        }

        const openai = new OpenAI({ apiKey });

        // Converter temperature de string para número (vem como decimal do banco)
        const temperature = persona.temperature ? parseFloat(persona.temperature.toString()) : 0.7;
        const maxTokens = persona.maxOutputTokens || 500;

        // Gerar resposta com ChatGPT usando parâmetros da persona
        const completion = await openai.chat.completions.create({
            model: persona.model || 'gpt-4o-mini',
            messages: chatMessages,
            temperature: temperature,
            max_tokens: maxTokens,
        });

        const aiResponse = completion.choices[0]?.message?.content;

        if (!aiResponse || aiResponse.trim().length === 0) {
            throw new Error('IA retornou resposta vazia.');
        }

        // Enviar resposta para o WhatsApp
        const messageParts = aiResponse.split(/\n\s*\n/).filter((part: string) => part.trim().length > 0);
        
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
                
                await sleep(1500); // Pausa entre as mensagens para parecer mais natural
            }
        }

        await logAutomation('INFO', `IA respondeu com sucesso usando ChatGPT (OpenAI).`, logContextBase);
        return true;
        
    } catch (error) {
        const sanitizedMessage = maskPII((error as Error).message);
        await logAutomation('ERROR', `Falha ao comunicar com a IA: ${sanitizedMessage}`, logContextBase);
        return false;
    }
}

export async function processIncomingMessageTrigger(conversationId: string, messageId: string): Promise<void> {
    console.log(`[Automation Engine] Gatilho recebido para a conversa ${conversationId} e mensagem ${messageId}`);
    
    // ✅ FIX: Controle de idempotência - verificar se já processamos esta mensagem
    // Evita respostas duplicadas quando webhook é reenviado
    const alreadyProcessed = await db.query.automationLogs.findFirst({
        where: and(
            eq(automationLogs.conversationId, conversationId),
            sql`${automationLogs.details}->>'processedMessageId' = ${messageId}`
        )
    });

    if (alreadyProcessed) {
        console.log(`[Automation Engine] Mensagem ${messageId} já foi processada. Ignorando para evitar duplicação.`);
        return;
    }
    
    const convoResult = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: { connection: true, contact: true }
    });

    if (!convoResult || !convoResult.companyId || !convoResult.contact || !convoResult.connection) {
        console.error(`[Automation Engine] Contexto inválido para a conversa ${conversationId}. A abortar.`);
        return;
    }

    const logContextBase = { companyId: convoResult.companyId, conversationId };
    
    // VERIFICAÇÃO #1: Roteamento para IA (Sistema Inteligente Multi-Dimensional)
    if (convoResult.aiActive) {
        const message = await db.query.messages.findFirst({ where: eq(messages.id, messageId) });
        if (message) {
            const context: AutomationTriggerContext = {
                companyId: convoResult.companyId,
                conversation: convoResult as AutomationTriggerContext['conversation'],
                contact: convoResult.contact,
                message: message,
            };
            
            // Seleção inteligente do agente IA baseado em: Funil + Estágio + Tipo de Contato
            const selectedPersonaId = await selectIntelligentPersona(
                context,
                convoResult.connection.assignedPersonaId
            );
            
            if (selectedPersonaId) {
                const aiResponded = await callExternalAIAgent(context, selectedPersonaId);
                if (aiResponded) {
                    // ✅ Marcar mensagem como processada após sucesso
                    await logAutomation('INFO', 'Mensagem processada com sucesso pela IA', { 
                        ...logContextBase, 
                        details: { processedMessageId: messageId }
                    });
                    return; // Se a IA respondeu, o fluxo termina aqui.
                }
            } else {
                await logAutomation('INFO', 'Sem agente IA configurado para esta conversa.', logContextBase);
            }
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
