// src/lib/automation-engine.ts
'use server';

import { db } from './db';
import {
  automationRules,
  contacts,
  contactsToTags,
  contactsToContactLists,
  conversations,
  messages,
  automationLogs,
  connections,
  aiPersonas,
  whatsappDeliveryReports,
} from './db/schema';
import { and, eq, gte, or, isNull, sql } from 'drizzle-orm';
import type {
  AutomationCondition,
  AutomationAction,
  Contact,
  User,
  Message,
  KanbanStage,
} from './types';
import { sendWhatsappTextMessage } from './facebookApiService';
import { sendUnifiedMessage } from '@/services/unified-message-sender.service';
import OpenAI from 'openai';
import {
  detectLanguage,
  getPersonaPromptSections,
  assembleDynamicPrompt,
  estimateTokenCount,
} from './prompt-utils';
import { kanbanLeads, kanbanStagePersonas } from './db';
import { apiCache } from './api-cache';

// Mapa de variáveis disponíveis por evento webhook
const _WEBHOOK_VARIABLE_TEMPLATES: Record<string, Array<{key: string, label: string}>> = {
  'webhook_pix_created': [
    { key: 'customer_name', label: 'Nome do Cliente' },
    { key: 'customer_phone', label: 'Telefone' },
    { key: 'customer_email', label: 'Email' },
    { key: 'pix_value', label: 'Valor do PIX' },
    { key: 'pix_code', label: 'Código PIX' },
    { key: 'product_name', label: 'Nome do Produto' },
    { key: 'order_id', label: 'ID do Pedido' },
  ],
  'webhook_order_approved': [
    { key: 'customer_name', label: 'Nome do Cliente' },
    { key: 'customer_phone', label: 'Telefone' },
    { key: 'customer_email', label: 'Email' },
    { key: 'order_value', label: 'Valor da Compra' },
    { key: 'product_name', label: 'Nome do Produto' },
    { key: 'order_id', label: 'ID do Pedido' },
    { key: 'payment_method', label: 'Método de Pagamento' },
  ],
  'webhook_lead_created': [
    { key: 'customer_name', label: 'Nome do Cliente' },
    { key: 'customer_phone', label: 'Telefone' },
    { key: 'customer_email', label: 'Email' },
    { key: 'product_name', label: 'Nome do Produto' },
  ],
};

// Função para interpolar variáveis webhook na mensagem
function interpolateWebhookVariables(template: string, webhookData: Record<string, any>): string {
  if (!template || !webhookData) return template;
  
  const customer = webhookData.customer || {};
  const product = webhookData.product || {};
  const order = webhookData.order || {};
  
  const variables: Record<string, string> = {
    'customer_name': customer.name || '',
    'customer_phone': customer.phoneNumber || customer.phone || '',
    'customer_email': customer.email || '',
    'product_name': product.name || '',
    'order_value': formatCurrencyForMessage(order.value || product.value || webhookData.value || 0),
    'order_id': order.id || webhookData.orderId || webhookData.order_id || '',
    'pix_code': webhookData.pixCode || webhookData.pix_code || '',
    'pix_value': formatCurrencyForMessage(webhookData.pixValue || webhookData.pix_value || 0),
    'payment_method': order.paymentMethod || webhookData.payment_method || '',
  };
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    // Escapar caracteres especiais do regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`{{${escapedKey}}}`, 'g'), value);
  }
  
  return result;
}

// Função auxiliar para formatação de moeda em mensagens
function formatCurrencyForMessage(value: number | string): string {
  if (!value) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

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

// Função de logging com console persistence (DB a implementar em próxima fase com migrations)
async function logAutomation(level: LogLevel, message: string, context: LogContext): Promise<void> {
    const maskedMessage = maskPII(message);
    const maskedDetails = context.details ? JSON.parse(maskPII(JSON.stringify(context.details))) : {};

    const logMessage = `[Automation|${level}|Conv:${context.conversationId}|Rule:${context.ruleId || 'N/A'}] ${maskedMessage}`;
    console.log(logMessage, maskedDetails);
    
    try {
        // v2.9.0: Logging via console (persistence ready for next phase)
        // TODO: Implement DB insert in FASE 2 with proper migration
        console.log(`✅ [Automation Logger] Log recorded: ${maskedMessage}`);
    } catch (dbError: any) {
        console.error(`[Automation Logger] Error:`, dbError.message || dbError);
        // Não falha a automação se log falhar
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

async function executeAction(action: AutomationAction, context: AutomationTriggerContext, ruleId: string, webhookData?: Record<string, any>): Promise<void> {
    const { contact, conversation } = context;
    const logContext: LogContext = { companyId: context.companyId, conversationId: context.conversation.id, ruleId, details: { action } };

    try {
        switch (action.type) {
            case 'send_message': {
                if (!action.value || !conversation.connectionId) return;
                // Interpolar variáveis se houver dados de webhook
                const messageText = webhookData ? interpolateWebhookVariables(action.value, webhookData) : action.value;
                await sendWhatsappTextMessage({ connectionId: conversation.connectionId, to: contact.phone, text: messageText });
                break;
            }
            case 'send_message_apicloud': {
                if (!action.connectionId) return;
                
                // ✅ v2.10.25: DEDUPLICAÇÃO para automações webhook
                // Verificar se há delivery report recente (últimos 5 minutos) para este contato
                const recentReportApiCloud = await db
                    .select({ id: whatsappDeliveryReports.id })
                    .from(whatsappDeliveryReports)
                    .where(and(
                        eq(whatsappDeliveryReports.contactId, contact.id),
                        eq(whatsappDeliveryReports.connectionId, action.connectionId),
                        sql`${whatsappDeliveryReports.sentAt} > NOW() - INTERVAL '5 minutes'`
                    ))
                    .limit(1);
                
                if (recentReportApiCloud.length > 0) {
                    console.log(`[Automation|Dedup] ✅ Pulando envio via APICloud para ${contact.phone} - já enviado nos últimos 5 minutos`);
                    await logAutomation('INFO', `Deduplicação: mensagem não enviada (já enviada recentemente)`, logContext);
                    return;
                }
                
                // ✅ v2.10.6: Allow empty value for templates (content from templateId)
                // Interpolar variáveis se houver dados de webhook
                const messageText = action.value ? (webhookData ? interpolateWebhookVariables(action.value, webhookData) : action.value) : '';
                console.log(`[Automation|DEBUG] Sending API Cloud message:`, { phone: contact.phone, templateId: (action as any).templateId, hasValue: !!action.value });
                const result = await sendUnifiedMessage({
                    provider: 'apicloud',
                    connectionId: action.connectionId,
                    to: contact.phone,
                    message: messageText,
                    templateId: (action as any).templateId,
                });
                if (!result.success) throw new Error(result.error || 'Falha ao enviar via APICloud');
                await logAutomation('INFO', `Mensagem enviada via APICloud para ${contact.phone}`, logContext);
                break;
            }
            case 'send_message_baileys': {
                if (!action.connectionId) return;
                
                // ✅ v2.10.25: DEDUPLICAÇÃO para automações webhook
                // Verificar se há delivery report recente (últimos 5 minutos) para este contato
                const recentReportBaileys = await db
                    .select({ id: whatsappDeliveryReports.id })
                    .from(whatsappDeliveryReports)
                    .where(and(
                        eq(whatsappDeliveryReports.contactId, contact.id),
                        eq(whatsappDeliveryReports.connectionId, action.connectionId),
                        sql`${whatsappDeliveryReports.sentAt} > NOW() - INTERVAL '5 minutes'`
                    ))
                    .limit(1);
                
                if (recentReportBaileys.length > 0) {
                    console.log(`[Automation|Dedup] ✅ Pulando envio via Baileys para ${contact.phone} - já enviado nos últimos 5 minutos`);
                    await logAutomation('INFO', `Deduplicação: mensagem não enviada (já enviada recentemente)`, logContext);
                    return;
                }
                
                // ✅ v2.10.6: Allow empty value for templates (content from templateId)
                // Interpolar variáveis se houver dados de webhook
                const messageText = action.value ? (webhookData ? interpolateWebhookVariables(action.value, webhookData) : action.value) : '';
                console.log(`[Automation|DEBUG] Sending Baileys message:`, { phone: contact.phone, templateId: (action as any).templateId, hasValue: !!action.value });
                const result = await sendUnifiedMessage({
                    provider: 'baileys',
                    connectionId: action.connectionId,
                    to: contact.phone,
                    message: messageText,
                    templateId: (action as any).templateId,
                });
                if (!result.success) throw new Error(result.error || 'Falha ao enviar via Baileys');
                await logAutomation('INFO', `Mensagem enviada via Baileys para ${contact.phone}`, logContext);
                break;
            }

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
            case 'move_to_stage': {
                if (!action.value) return;
                const activeLeadResult = await db.select().from(kanbanLeads).where(eq(kanbanLeads.contactId, contact.id)).limit(1);
                if (activeLeadResult && activeLeadResult[0]) {
                    const lead = activeLeadResult[0];
                    const targetStageId = action.value;
                    // TODO: implement board relationship loading
                    const stages: any[] = [];
                    const targetStage = stages.find(s => s.id === targetStageId);
                    
                    if (!targetStage) {
                        await logAutomation('WARN', `Estágio inválido "${targetStageId}" não encontrado no funil. Ação 'move_to_stage' ignorada.`, logContext);
                        return;
                    }
                    
                    if (targetStage.type === 'WIN' || targetStage.type === 'LOSS') {
                        await logAutomation('WARN', `Estágio final "${targetStage.title}" (${targetStage.type}). Movimentação via automação bloqueada por segurança.`, logContext);
                        return;
                    }
                    
                    await db.update(kanbanLeads)
                        .set({ stageId: targetStageId })
                        .where(eq(kanbanLeads.id, lead.id));
                    await logAutomation('INFO', `Lead movido para o estágio: ${targetStage.title} (${targetStageId})`, logContext);
                } else {
                    await logAutomation('WARN', `Contato não possui lead ativo no Kanban. Ação 'move_to_stage' ignorada.`, logContext);
                }
                break;
            }
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
        const activeLeadResults = await db.select().from(kanbanLeads).where(eq(kanbanLeads.contactId, contact.id)).limit(1);
        const activeLeadResult = activeLeadResults[0];

        const contactType = conversation.contactType || 'PASSIVE';

        if (activeLeadResult) {
            // TODO: implement board relationship loading
            const boardData = { name: 'Funil', funnelType: 'GENERAL' } as { name: string; funnelType?: string };
            await logAutomation('INFO', `Lead encontrado no funil "${boardData.name}" (Tipo: ${boardData.funnelType || 'GENERAL'}, Estágio: ${activeLeadResult.stageId})`, logContextBase);

            const stagePersonaConfigs = await db.select().from(kanbanStagePersonas).where(and(
                eq(kanbanStagePersonas.boardId, activeLeadResult.boardId),
                eq(kanbanStagePersonas.stageId, activeLeadResult.stageId)
            )).limit(1);
            const stagePersonaConfig = stagePersonaConfigs[0];

            if (stagePersonaConfig) {
                const selectedPersonaId = contactType === 'ACTIVE' 
                    ? stagePersonaConfig.activePersonaId 
                    : stagePersonaConfig.passivePersonaId;

                if (selectedPersonaId) {
                    await logAutomation('INFO', `✅ [Prioridade 1] Agente IA selecionado (nível estágio): Funil="${boardData.name}", Estágio="${activeLeadResult.stageId}", Tipo="${contactType}"`, logContextBase);
                    return selectedPersonaId;
                }
            }

            const boardPersonaConfigs = await db.select().from(kanbanStagePersonas).where(and(
                eq(kanbanStagePersonas.boardId, activeLeadResult.boardId),
                isNull(kanbanStagePersonas.stageId)
            )).limit(1);
            const boardPersonaConfig = boardPersonaConfigs[0];

            if (boardPersonaConfig) {
                const selectedPersonaId = contactType === 'ACTIVE' 
                    ? boardPersonaConfig.activePersonaId 
                    : boardPersonaConfig.passivePersonaId;

                if (selectedPersonaId) {
                    await logAutomation('INFO', `✅ [Prioridade 2] Agente IA selecionado (nível funil): Funil="${boardData.name}", Tipo="${contactType}"`, logContextBase);
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

// 🔒 REGRAS INTERNAS OBRIGATÓRIAS (Hard-coded, não podem ser removidas pelo usuário)
const INTERNAL_RULES = `REGRAS INTERNAS OBRIGATÓRIAS:
- NUNCA se identifique como "assistente virtual", "IA", "inteligência artificial", "robô", "bot" ou similar
- Você é um atendente REAL da empresa, não um sistema automatizado
- Seja genuíno, autêntico e natural nas interações
- Responda como se fosse uma pessoa de verdade atendendo pelo WhatsApp
- Mantenha a naturalidade e humanização em todas as respostas`;

async function callExternalAIAgent(context: AutomationTriggerContext, personaId: string) {
    const { companyId, conversation, contact, message } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };
    
    await logAutomation('INFO', `Conversa roteada para o Agente de IA (Persona ID: ${personaId}).`, logContextBase);

    try {
        // Buscar a persona do banco de dados
        const personas = await db.select().from(aiPersonas).where(eq(aiPersonas.id, personaId)).limit(1);
        const persona = personas[0];

        if (!persona) {
            throw new Error(`Persona ${personaId} não encontrada no banco de dados.`);
        }

        await logAutomation('INFO', `Usando persona: ${persona.name} (Provider: ${persona.provider}, Model: ${persona.model})`, logContextBase);

        // Verificar se a persona usa OpenAI
        if (persona.provider !== 'OPENAI') {
            throw new Error(`Persona usa provider ${persona.provider}, mas apenas OPENAI é suportado nesta função.`);
        }

        // 🕒 DELAYS HUMANIZADOS: Detectar se é primeira resposta ou demais respostas (24h window)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAIMessages = await db.select().from(messages).where(and(
            eq(messages.conversationId, conversation.id),
            eq(messages.senderType, 'AI'),
            gte(messages.sentAt, twentyFourHoursAgo)
        )).limit(1);

        const isFirstResponse = recentAIMessages.length === 0;
        
        // Calcular delay humanizado baseado na configuração do agente
        let minDelay = isFirstResponse ? persona.firstResponseMinDelay : persona.followupResponseMinDelay;
        let maxDelay = isFirstResponse ? persona.firstResponseMaxDelay : persona.followupResponseMaxDelay;
        
        // Guard: garantir que min <= max (corrigir ranges malformados)
        if (minDelay > maxDelay) {
            await logAutomation('WARN', `⚠️  Invalid delay range detected (min: ${minDelay}, max: ${maxDelay}). Swapping values.`, logContextBase);
            [minDelay, maxDelay] = [maxDelay, minDelay];
        }
        
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        
        const responseType = isFirstResponse ? 'primeira resposta (24h)' : 'demais respostas';
        await logAutomation('INFO', `🕒 Delay humanizado: ${randomDelay}s (${responseType}, range: ${minDelay}-${maxDelay}s)`, logContextBase);
        
        // Aplicar delay antes de gerar resposta
        await sleep(randomDelay * 1000);

        // ✅ FIX: Buscar mensagens mais recentes primeiro (DESC) e reverter para ordem cronológica
        // Isso garante que pegamos as mensagens MAIS NOVAS, não as antigas
        const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).limit(20);

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
                systemPrompt = INTERNAL_RULES + '\n\n' + assembleDynamicPrompt(promptSections, contextInfo);
                await logAutomation('INFO', `Sistema RAG ativo: ${promptSections.length} seções carregadas (${estimateTokenCount(systemPrompt)} tokens estimados)`, logContextBase);
            } else {
                // RAG ativo mas sem seções - avisar e usar fallback
                systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um atendente especializado da empresa no WhatsApp.`;
                systemPrompt = INTERNAL_RULES + '\n\n' + systemPrompt;
                systemPrompt += `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contact.name || 'Cliente'}\n- Telefone: ${contact.phone}`;
                await logAutomation('WARN', `RAG ativo mas sem seções encontradas. Usando systemPrompt tradicional (${estimateTokenCount(systemPrompt)} tokens estimados)`, logContextBase);
            }
        } else {
            // RAG desativado: usar systemPrompt tradicional da tabela ai_personas
            systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um atendente especializado da empresa no WhatsApp.`;
            systemPrompt = INTERNAL_RULES + '\n\n' + systemPrompt;
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
                
                // Invalidar cache de conversas após inserir mensagem
                apiCache.invalidatePattern(`conversations:${companyId}`);
                
                await sleep(1500); // Pausa entre as mensagens para parecer mais natural
            }
        }

        await logAutomation('INFO', `IA respondeu com sucesso usando ChatGPT (OpenAI).`, logContextBase);
        
        // ✅ SISTEMA DE QUALIFICAÇÃO AUTOMÁTICA
        // Detectar se o lead deve avançar para o próximo estágio com base na conversa
        await detectAndProgressLead(context, recentMessages, aiResponse);
        
        // 📅 SISTEMA DE DETECÇÃO DE REUNIÃO MARCADA
        // Detectar se uma reunião foi agendada e mover para stage específico
        const conversationText = recentMessages.map(m => m.content).join('\n');
        const meetingDetection = detectMeetingScheduled(conversationText, aiResponse);
        
        if (meetingDetection.isMeetingScheduled) {
            await moveLeadToSemanticStage(context, 'meeting_scheduled', meetingDetection.evidence, meetingDetection.scheduledTime);
        }
        
        return true;
        
    } catch (error) {
        const sanitizedMessage = maskPII((error as Error).message);
        await logAutomation('ERROR', `Falha ao comunicar com a IA: ${sanitizedMessage}`, logContextBase);
        return false;
    }
}

async function detectAndProgressLead(
    context: AutomationTriggerContext,
    conversationHistory: Message[],
    latestAIResponse: string
): Promise<void> {
    const { contact, companyId, conversation } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };

    try {
        // Buscar lead ativo
        const activeLeadQueryResults = await db.select().from(kanbanLeads).where(eq(kanbanLeads.contactId, contact.id)).limit(1);
        const activeLeadQuery = activeLeadQueryResults[0];

        if (!activeLeadQuery) {
            return; // Sem lead ativo, não há o que qualificar
        }

        // Buscar configuração dos estágios do funil (TODO: implement board relationship)
        const boardData = { stages: [] } as { stages?: unknown[] };
        const stages = (boardData.stages || []) as KanbanStage[];
        const currentStageIndex = stages.findIndex(s => s.id === activeLeadQuery.stageId);
        
        if (currentStageIndex === -1 || currentStageIndex >= stages.length - 1) {
            return; // Estágio inválido ou já está no último estágio
        }

        // Analisar conversa para detectar sinais de qualificação
        const conversationText = conversationHistory
            .map(m => m.content)
            .join('\n');

        const qualificationSignals = detectQualificationSignals(conversationText, latestAIResponse);
        
        if (qualificationSignals.shouldProgress) {
            const nextStage = stages[currentStageIndex + 1];
            const currentStage = stages[currentStageIndex];
            
            if (!nextStage || !currentStage) {
                await logAutomation('WARN', 'Não foi possível avançar o lead: estágio atual ou próximo inválido', logContextBase);
                return;
            }
            
            await db.update(kanbanLeads)
                .set({ stageId: nextStage.id })
                .where(eq(kanbanLeads.id, activeLeadQuery.id));
            
            await logAutomation('INFO', `🎯 QUALIFICAÇÃO AUTOMÁTICA: Lead "${contact.name}" avançou de "${currentStage.title}" para "${nextStage.title}" | Confiança: ${qualificationSignals.confidence}% | Motivo: ${qualificationSignals.reason}`, logContextBase);
        }
        
    } catch (error) {
        await logAutomation('ERROR', `Erro ao tentar qualificar lead automaticamente: ${(error as Error).message}`, logContextBase);
    }
}

interface QualificationSignals {
    shouldProgress: boolean;
    confidence: number;
    reason: string;
}

function detectQualificationSignals(conversationText: string, latestResponse: string): QualificationSignals {
    const text = (conversationText + '\n' + latestResponse).toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // SINAIS POSITIVOS FORTES (peso 30 pontos cada)
    const strongPositiveSignals = [
        { pattern: /\b(quero contratar|fechar|aceito|vamos fechar|pode enviar proposta)\b/, reason: 'Demonstrou intenção clara de contratar' },
        { pattern: /\b(qual.{0,20}pre[çc]o|quanto custa|valor do investimento)\b/, reason: 'Perguntou sobre preço/investimento' },
        { pattern: /\b(pode me enviar|envia.{0,15}proposta|manda.{0,15}or[çc]amento)\b/, reason: 'Solicitou proposta formal' },
    ];

    for (const signal of strongPositiveSignals) {
        if (signal.pattern.test(text)) {
            score += 30;
            reasons.push(signal.reason);
        }
    }

    // SINAIS MÉDIOS (peso 20 pontos cada)
    const mediumSignals = [
        { pattern: /\b(interessado|interesse|gostei|adorei|perfeito)\b/, reason: 'Demonstrou interesse' },
        { pattern: /\b(preciso|necessito|busco|procuro)\b/, reason: 'Expressou necessidade' },
        { pattern: /\b(quando.{0,15}come[çc]|prazo|cronograma)\b/, reason: 'Perguntou sobre prazos' },
        { pattern: /\b(sim|exato|isso mesmo|correto)\b.*\b(entendi|compreendi)\b/, reason: 'Confirmou entendimento positivo' },
    ];

    for (const signal of mediumSignals) {
        if (signal.pattern.test(text)) {
            score += 20;
            reasons.push(signal.reason);
        }
    }

    // SINAIS FRACOS (peso 10 pontos cada)
    const weakSignals = [
        { pattern: /\b(obrigad[oa]|valeu|ajudou|esclareceu)\b/, reason: 'Agradeceu pela informação' },
        { pattern: /\b(entendi|compreendi|ok|certo)\b/, reason: 'Confirmou compreensão' },
    ];

    for (const signal of weakSignals) {
        if (signal.pattern.test(text)) {
            score += 10;
            reasons.push(signal.reason);
        }
    }

    // SINAIS NEGATIVOS (reduz pontos)
    const negativeSignals = [
        { pattern: /\b(n[aã]o.{0,15}interesse|desisto|cancelar|n[aã]o quero)\b/, penalty: -50 },
        { pattern: /\b(muito caro|n[aã]o tenho.{0,15}dinheiro|or[çc]amento.{0,15}baixo)\b/, penalty: -30 },
        { pattern: /\b(depois|mais tarde|outro momento)\b/, penalty: -15 },
    ];

    for (const signal of negativeSignals) {
        if (signal.pattern.test(text)) {
            score += signal.penalty;
        }
    }

    // THRESHOLD: 60 pontos = progresso automático
    const confidence = Math.min(100, Math.max(0, score));
    const shouldProgress = confidence >= 60;
    const reason = reasons.length > 0 ? reasons.join(', ') : 'Sem sinais claros de qualificação';

    return {
        shouldProgress,
        confidence,
        reason
    };
}

// 📅 SISTEMA DE DETECÇÃO DE REUNIÃO MARCADA
interface MeetingDetectionResult {
    isMeetingScheduled: boolean;
    confidence: number;
    evidence: string[];
    scheduledTime?: string;
}

function detectMeetingScheduled(conversationText: string, latestResponse: string): MeetingDetectionResult {
    const text = (conversationText + '\n' + latestResponse).toLowerCase();
    let score = 0;
    const evidence: string[] = [];

    // Padrão de dia da semana compartilhado (aceita "feira" opcional com espaço ou hífen)
    const weekdayPattern = '(?:segunda|ter[cç]a(?:[\\s-]?feira)?|quarta(?:[\\s-]?feira)?|quinta(?:[\\s-]?feira)?|sexta(?:[\\s-]?feira)?|s[áa]bado|domingo)';
    
    // SINAIS MUITO FORTES de agendamento (40 pontos cada)
    const veryStrongSignals = [
        { pattern: /\b(reuni[aã]o marcada|agendado|confirmado|horário confirmado)\b/, desc: 'Confirmação explícita de agendamento' },
        { pattern: new RegExp(`\\b(te espero|nos vemos|até.{0,15}${weekdayPattern})\\b`, 'i'), desc: 'Confirmação de encontro futuro' },
        { pattern: /\b(confirmo.{0,15}participa[çc][aã]o|confirmado para|vou participar)\b/, desc: 'Participação confirmada' },
    ];

    for (const signal of veryStrongSignals) {
        if (signal.pattern.test(text)) {
            score += 40;
            evidence.push(signal.desc);
        }
    }

    // SINAIS FORTES de agendamento (30 pontos cada)
    const strongSignals = [
        { pattern: /\b(envi[ae].{0,15}(2|dois|tr[eê]s|3).{0,15}hor[áa]rios?|que horas?.*prefer[eê]|hor[áa]rio.*melhor)\b/, desc: 'Solicitação de horários disponíveis' },
        { pattern: /\b(vamos marcar|pode ser|aceito|marca.{0,15}(reuni[aã]o|call|liga[çc][aã]o))\b/, desc: 'Aceitação de agendamento' },
        { pattern: new RegExp(`\\b${weekdayPattern}.{0,20}(\\d{1,2}h|\\d{1,2}:\\d{2})\\b`, 'i'), desc: 'Dia e hora específicos mencionados' },
        { pattern: new RegExp(`\\b(\\d{1,2}h|\\d{1,2}:\\d{2}).{0,30}${weekdayPattern}\\b`, 'i'), desc: 'Hora e dia específicos mencionados' },
    ];

    for (const signal of strongSignals) {
        if (signal.pattern.test(text)) {
            score += 30;
            evidence.push(signal.desc);
        }
    }

    // SINAIS MÉDIOS de contexto de reunião (20 pontos cada)
    const mediumSignals = [
        { pattern: /\b(reuni[aã]o|meeting|meet|call|chamada|liga[çc][aã]o|videochamada|videoconfer[eê]ncia|video.?call|zoom|google.?meet|teams|conversa.?online)\b/, desc: 'Menção a reunião/call' },
        { pattern: /\b(agendar|marcar|encontro|confirm(?:ar|o|a|ando)|confirmado|bate.?papo presencial|conversar pessoalmente|marcar.?um.?hor[áa]rio)\b/, desc: 'Intenção de agendar' },
        { pattern: /\b(calend[áa]rio|agenda|disponibilidade|dispon[íi]vel)\b/, desc: 'Contexto de calendário/agenda' },
        { pattern: /\b(entre.{0,10}(08h?|8h?|09h?|9h?).{0,10}(19h?|18h?))\b/, desc: 'Faixa de horário mencionada' },
    ];

    for (const signal of mediumSignals) {
        if (signal.pattern.test(text)) {
            score += 20;
            evidence.push(signal.desc);
        }
    }

    // THRESHOLD: 60 pontos = reunião marcada com boa confiança (ajustado para maior sensibilidade)
    const confidence = Math.min(100, Math.max(0, score));
    const isMeetingScheduled = confidence >= 60;

    // Extrair horário mencionado (múltiplos formatos suportados)
    // TODOS os padrões EXIGEM marcador de hora ('h' ou ':') para evitar false positives
    let scheduledTime = '';
    
    // Função auxiliar para normalizar horário
    const normalizeTime = (timeStr: string): string => {
        let cleaned = timeStr.toLowerCase().trim();
        
        // Converte "hs" → "h" (plural para singular)
        cleaned = cleaned.replace(/hs\b/g, 'h');
        
        // Remove "min" ao final
        cleaned = cleaned.replace(/min$/g, '').trim();
        
        // Formato: 14h30 ou 14h00 -> 14:30 ou 14h
        cleaned = cleaned.replace(/(\d{1,2})h(\d{1,2})/, (_, h, m) => {
            return m === '00' || m === '0' ? `${h}h` : `${h}:${m.padStart(2, '0')}`;
        });
        
        // Remove 'h' final duplicado se houver dois pontos (14:30h -> 14:30)
        cleaned = cleaned.replace(/:(\d{2})h$/,  ':$1');
        
        return cleaned;
    };
    
    // Padrão de dia da semana para extração (aceita "feira" opcional com espaço ou hífen)
    const weekdayExtractPattern = '(segunda|ter[cç]a(?:[\\s-]?feira)?|quarta(?:[\\s-]?feira)?|quinta(?:[\\s-]?feira)?|sexta(?:[\\s-]?feira)?|s[áa]bado|domingo)';
    
    // IMPORTANTE: Usar matchAll para pegar TODAS as ocorrências e escolher a ÚLTIMA (mais recente)
    // Isso garante que confirmações novas sobrescrevam menções antigas no histórico
    
    // Padrão 1: Dia da semana + horário (ex: "terça às 14h", "quinta 15h30", "quinta-feira às 14h30")
    const dayFirstPattern = new RegExp(`\\b${weekdayExtractPattern}[\\s,]*(?:[aà]s?)?\\s*(\\d{1,2}(?:h(?:\\d{1,2})?|: ?\\d{2})(?:hs?|min)?)\\b`, 'gi');
    const dayFirstMatches = Array.from(text.matchAll(dayFirstPattern));
    
    if (dayFirstMatches.length > 0) {
        // Pegar o ÚLTIMO match (mais recente na conversa)
        const lastMatch = dayFirstMatches[dayFirstMatches.length - 1];
        if (lastMatch && lastMatch[1] && lastMatch[2] && (lastMatch[2].includes('h') || lastMatch[2].includes(':'))) {
            const dayName = lastMatch[1].replace(/[\s-]?feira/i, '').trim();
            scheduledTime = `${dayName} às ${normalizeTime(lastMatch[2])}`;
        }
    } else {
        // Padrão 2: Horário + dia da semana (ex: "às 14h na terça", "14:30 quinta")
        const timeFirstPattern = new RegExp(`\\b(?:[aà]s?)?\\s*(\\d{1,2}(?:h(?:\\d{1,2})?|: ?\\d{2})(?:hs?|min)?)[\\s,]*(?:na|no|em)?\\s*${weekdayExtractPattern}\\b`, 'gi');
        const timeFirstMatches = Array.from(text.matchAll(timeFirstPattern));
        
        if (timeFirstMatches.length > 0) {
            // Pegar o ÚLTIMO match (mais recente na conversa)
            const lastMatch = timeFirstMatches[timeFirstMatches.length - 1];
            if (lastMatch && lastMatch[1] && lastMatch[2] && (lastMatch[1].includes('h') || lastMatch[1].includes(':'))) {
                const dayName = lastMatch[2].replace(/[\s-]?feira/i, '').trim();
                scheduledTime = `${dayName} às ${normalizeTime(lastMatch[1])}`;
            }
        } else {
            // Padrão 3: Só horário (MUST have 'h' or ':') - ex: "às 14h", "15hs", "14:30"
            // Aceita: 14h, 14hs, 14h30, 14:30, 14:30h, 14:30hs
            // Rejeita: 3, 14, 30 (números sem marcador)
            const timeOnlyPattern = /\b(?:[aà]s?)?\s*(\d{1,2}(?:hs|h\d{0,2}|:\d{2}(?:hs?)?)(?:min)?)\b/gi;
            const timeOnlyMatches = Array.from(text.matchAll(timeOnlyPattern));
            
            if (timeOnlyMatches.length > 0) {
                // Pegar o ÚLTIMO match (mais recente na conversa)
                const lastMatch = timeOnlyMatches[timeOnlyMatches.length - 1];
                if (lastMatch && lastMatch[1] && (lastMatch[1].includes('h') || lastMatch[1].includes(':'))) {
                    scheduledTime = normalizeTime(lastMatch[1]);
                }
            }
        }
    }

    return {
        isMeetingScheduled,
        confidence,
        evidence,
        scheduledTime
    };
}

// 🎯 HELPER: Garantir que o horário da reunião esteja nas notas do lead (idempotente)
async function ensureMeetingNote(leadId: string, scheduledTime: string): Promise<boolean> {
    try {
        const leads = await db.select().from(kanbanLeads).where(eq(kanbanLeads.id, leadId)).limit(1);
        const lead = leads[0];

        if (!lead) return false;

        const normalizedNote = `📅 Reunião agendada: ${scheduledTime}`;
        const currentNotes = lead.notes || '';

        // Verificar se já existe uma nota de reunião para evitar duplicatas
        const hasExistingMeetingNote = /📅 Reunião agendada:/i.test(currentNotes);

        if (hasExistingMeetingNote) {
            // Se já existe uma nota de reunião, substituir pela nova
            const updatedNotes = currentNotes.replace(/📅 Reunião agendada:.*?(\n|$)/i, `${normalizedNote}\n`);
            await db.update(kanbanLeads)
                .set({ notes: updatedNotes.trim() })
                .where(eq(kanbanLeads.id, leadId));
        } else {
            // Adicionar nova nota no início, preservando conteúdo anterior
            const updatedNotes = currentNotes ? `${normalizedNote}\n\n${currentNotes}` : normalizedNote;
            await db.update(kanbanLeads)
                .set({ notes: updatedNotes })
                .where(eq(kanbanLeads.id, leadId));
        }

        return true;
    } catch (error) {
        console.error(`[ensureMeetingNote] Erro ao atualizar notas: ${(error as Error).message}`);
        return false;
    }
}

// 🎯 HELPER: Mover lead para stage com semanticType específico
async function moveLeadToSemanticStage(
    context: AutomationTriggerContext,
    targetSemanticType: KanbanStage['semanticType'],
    evidence: string[],
    scheduledTime?: string
): Promise<boolean> {
    const { contact, companyId, conversation } = context;
    const logContextBase: LogContext = { companyId, conversationId: conversation.id };

    if (!targetSemanticType) {
        await logAutomation('WARN', 'moveLeadToSemanticStage chamado sem semanticType', logContextBase);
        return false;
    }

    try {
        // Buscar lead ativo
        const activeLeadQueryResults = await db.select().from(kanbanLeads).where(eq(kanbanLeads.contactId, contact.id)).limit(1);
        const activeLeadQuery = activeLeadQueryResults[0];

        if (!activeLeadQuery) {
            await logAutomation('INFO', `Lead não encontrado no Kanban. Ação de mover para stage semântico ignorada.`, logContextBase);
            return false;
        }

        // Buscar stage com o semanticType desejado (TODO: implement board relationship)
        const boardData = { stages: [], name: 'Sem nome' } as { stages?: unknown[]; name?: string };
        const boardName = boardData.name || 'Sem nome';
        const stages = (boardData.stages || []) as KanbanStage[];
        const targetStage = stages.find(s => s.semanticType === targetSemanticType);

        if (!targetStage) {
            await logAutomation('WARN', `⚠️ Stage com semanticType="${targetSemanticType}" não encontrado no funil "${boardName}". Configure uma etapa com este tipo para ativar a automação.`, logContextBase);
            return false;
        }

        // Validar se não é stage final (WIN/LOSS)
        if (targetStage.type === 'WIN' || targetStage.type === 'LOSS') {
            await logAutomation('WARN', `Stage "${targetStage.title}" é final (${targetStage.type}). Movimentação via automação bloqueada por segurança.`, logContextBase);
            return false;
        }

        // Verificar se já está nesse stage
        if (activeLeadQuery.stageId === targetStage.id) {
            // Lead já está no stage correto, mas atualizar notas se houver horário
            if (scheduledTime && targetSemanticType === 'meeting_scheduled') {
                const noteUpdated = await ensureMeetingNote(activeLeadQuery.id, scheduledTime);
                if (noteUpdated) {
                    await logAutomation('INFO', `📅 REUNIÃO DETECTADA: Lead "${contact.name}" já está em "${targetStage.title}". Horário atualizado: ${scheduledTime}`, logContextBase);
                    return true;
                }
            }
            await logAutomation('INFO', `Lead já está no stage "${targetStage.title}". Nenhuma movimentação necessária.`, logContextBase);
            return false;
        }

        // Preparar atualização do lead com horário se disponível
        const updateData: { stageId: string; notes?: string } = { stageId: targetStage.id };
        if (scheduledTime && targetSemanticType === 'meeting_scheduled') {
            const currentNotes = activeLeadQuery.notes || '';
            const newNote = `📅 Reunião agendada: ${scheduledTime}`;
            updateData.notes = currentNotes ? `${newNote}\n\n${currentNotes}` : newNote;
        }

        // Mover lead para o stage
        await db.update(kanbanLeads)
            .set(updateData)
            .where(eq(kanbanLeads.id, activeLeadQuery.id));

        const evidenceText = evidence.length > 0 ? evidence.join(', ') : 'Detecção automática';
        const timeInfo = scheduledTime ? ` para ${scheduledTime}` : '';
        await logAutomation('INFO', `📅 REUNIÃO DETECTADA: Lead "${contact.name}" movido para "${targetStage.title}"${timeInfo} | Evidências: ${evidenceText}`, logContextBase);

        return true;

    } catch (error) {
        await logAutomation('ERROR', `Erro ao mover lead para stage semântico: ${(error as Error).message}`, logContextBase);
        return false;
    }
}

export async function processIncomingMessageTrigger(conversationId: string, messageId: string): Promise<void> {
    console.log(`[Automation Engine] Gatilho recebido para a conversa ${conversationId} e mensagem ${messageId}`);
    
    // ✅ FIX: Controle de idempotência - verificar se já processamos esta mensagem
    // Evita respostas duplicadas quando webhook é reenviado
    const alreadyProcessed = await db.select().from(automationLogs).where(and(
        eq(automationLogs.conversationId, conversationId),
        sql`${automationLogs.details}->>'processedMessageId' = ${messageId}`
    )).limit(1);

    if (alreadyProcessed) {
        console.log(`[Automation Engine] Mensagem ${messageId} já foi processada. Ignorando para evitar duplicação.`);
        return;
    }
    
    const convoResults = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    const convoResult = convoResults[0];

    const contactData = convoResult?.contactId ? null : null as any; // TODO: implement contact relationship
    const connectionData = convoResult?.connectionId ? null : null as any; // TODO: implement connection relationship
    
    if (!convoResult || !convoResult.companyId) {
        console.error(`[Automation Engine] Contexto inválido para a conversa ${conversationId}. A abortar.`);
        return;
    }

    const logContextBase = { companyId: convoResult.companyId, conversationId };
    
    // VERIFICAÇÃO #1: Roteamento para IA (Sistema Inteligente Multi-Dimensional)
    if (convoResult.aiActive) {
        const messageResults = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
        const message = messageResults[0];
        if (message) {
            const context: AutomationTriggerContext = {
                companyId: convoResult.companyId,
                conversation: convoResult as unknown as AutomationTriggerContext['conversation'],
                contact: contactData as Contact,
                message: message,
            };
            
            // Seleção inteligente do agente IA baseado em: Funil + Estágio + Tipo de Contato
            const selectedPersonaId = await selectIntelligentPersona(
                context,
                connectionData.assignedPersonaId || null
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
    const rules = await db.select().from(automationRules).where(and(
        eq(automationRules.companyId, convoResult.companyId),
        eq(automationRules.triggerEvent, 'new_message_received'),
        eq(automationRules.isActive, true),
        or(
            isNull(automationRules.connectionIds),
            sql`${connectionData.id} = ANY(${automationRules.connectionIds})`
        )
    ));

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
        conversation: convoResult as unknown as AutomationTriggerContext['conversation'],
        contact: contactData as Contact,
        message: message,
    };

    let anyRuleExecuted = false;
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
                await executeAction(action, context, rule.id, undefined); // No webhook data for message-triggered rules
            }
            anyRuleExecuted = true;
        }
    }
    
    // ✅ Marcar mensagem como processada após executar regras de automação
    if (anyRuleExecuted) {
        await logAutomation('INFO', 'Mensagem processada com sucesso por regras de automação', { 
            ...logContextBase, 
            details: { processedMessageId: messageId }
        });
    }
}

// NEW: Trigger automations for webhook events
export async function triggerAutomationForWebhook(
    companyId: string,
    eventType: string,
    webhookData: Record<string, any>
): Promise<void> {
    try {
        // ✅ FIX: Suportar AMBOS formatos - aninhado (Grapfy real) e plano (curl manual)
        // Formato aninhado: { customer: { name: "Diego", phoneNumber: "64999526870" } }
        // Formato plano: { customer: "Diego", phone: "64999526870" }
        
        let customer: { name?: string; email?: string; phoneNumber?: string; phone?: string } = {};
        
        // Parse customer - pode ser objeto ou string
        if (typeof webhookData.customer === 'object' && webhookData.customer !== null) {
            customer = webhookData.customer;
        } else if (typeof webhookData.customer === 'string') {
            customer = { name: webhookData.customer };
        }
        
        // Fallback para campos planos no root
        if (!customer.name && webhookData.customerName) customer.name = webhookData.customerName;
        if (!customer.email && webhookData.email) customer.email = webhookData.email;
        if (!customer.phoneNumber && webhookData.phone) customer.phoneNumber = webhookData.phone;
        if (!customer.phoneNumber && webhookData.phoneNumber) customer.phoneNumber = webhookData.phoneNumber;
        
        const contactPhone = customer.phoneNumber || customer.phone || '';
        
        if (!contactPhone) {
            console.warn('[Automation Engine] Webhook sem telefone do cliente. Ignorando.', {
                customerType: typeof webhookData.customer,
                hasPhone: !!webhookData.phone,
                hasPhoneNumber: !!webhookData.phoneNumber,
            });
            return;
        }

        // Find or create contact from webhook
        const contactResults = await db.select().from(contacts).where(
            eq(contacts.phone, contactPhone)
        ).limit(1);
        
        let contact = contactResults[0];
        if (!contact) {
            const result = await db.insert(contacts).values({
                companyId,
                name: customer.name || 'Unknown',
                email: customer.email || '',
                phone: contactPhone,
                status: 'active',
            }).returning();
            contact = result[0];
        }

        if (!contact) return;

        // Map webhook event types to trigger events
        const triggerEventMap: Record<string, string> = {
            'pix_created': 'webhook_pix_created',
            'order_approved': 'webhook_order_approved',
            'lead_created': 'webhook_lead_created',
            'lead.created': 'webhook_lead_created',
        };

        const triggerEvent = triggerEventMap[eventType] || 'webhook_custom';

        // Find matching automation rules
        const rules = await db.select().from(automationRules).where(and(
            eq(automationRules.companyId, companyId),
            eq(automationRules.triggerEvent, triggerEvent),
            eq(automationRules.isActive, true)
        ));

        if (rules.length === 0) {
            console.log(`[Automation Engine] Nenhuma regra de automação para ${triggerEvent}`);
            return;
        }

        console.log(`[Automation Engine] Executando ${rules.length} regra(s) para evento ${eventType}`);

        for (const rule of rules) {
            const logContext = { companyId, conversationId: 'webhook_' + Date.now(), ruleId: rule.id };
            
            try {
                // Mock context for webhook triggers (sem conversa)
                const mockConversation = {
                    id: 'webhook_' + Date.now(),
                    companyId,
                    connectionId: null,
                } as any;

                const mockMessage = {
                    id: 'webhook_msg_' + Date.now(),
                    content: `Webhook: ${eventType}`,
                } as any;

                const context: AutomationTriggerContext = {
                    companyId,
                    conversation: mockConversation,
                    contact,
                    message: mockMessage,
                };

                // Execute all actions for this rule (passando webhookData para interpolação)
                for (const action of rule.actions) {
                    await executeAction(action, context, rule.id, webhookData);
                }

                await logAutomation('INFO', `Regra webhook executada: ${rule.name}`, logContext);
            } catch (error) {
                await logAutomation('ERROR', `Erro ao executar regra webhook: ${(error as Error).message}`, logContext);
            }
        }
    } catch (error) {
        console.error('[Automation Engine] Erro ao disparar automações webhook:', error);
    }
}
