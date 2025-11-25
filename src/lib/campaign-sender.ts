// src/lib/campaign-sender.ts
'use server';

import { db } from '@/lib/db';
import { 
    campaigns, 
    contactsToContactLists, 
    contacts, 
    smsGateways, 
    smsDeliveryReports, 
    templates, 
    mediaAssets, 
    whatsappDeliveryReports,
    connections,
    messageTemplates,
    conversations,
    messages
} from '@/lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { decrypt } from './crypto';
import { sendWhatsappTemplateMessage } from './facebookApiService';
import type { MediaAsset as MediaAssetType, MetaApiMessageResponse, MetaHandle } from './types';
import { sessionManager as baileysSessionManager } from '@/services/baileys-session-manager';
import { NotificationService } from '@/lib/notifications/notification-service';
import { UserNotificationsService } from '@/lib/notifications/user-notifications.service';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';
import * as CircuitBreaker from '@/lib/circuit-breaker';
import { normalizeBrazilianSMS } from '@/lib/utils/phone';

// Helper para dividir um array em lotes
function chunkArray<T>(array: T[], size: number): T[][] {
    if (size <= 0) return [array]; // Retorna um único lote se o tamanho for inválido
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Helper para criar uma pausa
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para criar/atualizar conversa e salvar mensagem de campanha
async function createCampaignConversationAndMessage(
    companyId: string,
    contactId: string,
    connectionId: string,
    providerMessageId: string | null,
    messageContent: string,
    _campaignId: string
): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            // Buscar ou criar conversa
            let [conversation] = await tx
                .select()
                .from(conversations)
                .where(and(
                    eq(conversations.contactId, contactId),
                    eq(conversations.connectionId, connectionId)
                ));
            
            if (conversation) {
                // Atualiza conversa existente
                const [updatedConvo] = await tx
                    .update(conversations)
                    .set({
                        lastMessageAt: new Date(),
                        status: 'IN_PROGRESS',
                        archivedAt: null,
                        archivedBy: null,
                    })
                    .where(eq(conversations.id, conversation.id))
                    .returning();
                conversation = updatedConvo;
            } else {
                // Cria nova conversa
                [conversation] = await tx
                    .insert(conversations)
                    .values({
                        companyId,
                        contactId,
                        connectionId,
                        status: 'IN_PROGRESS',
                        lastMessageAt: new Date(),
                    })
                    .returning();
            }
            
            if (!conversation) {
                throw new Error('Falha ao criar ou atualizar conversa para mensagem de campanha.');
            }
            
            // Salvar mensagem de campanha
            await tx.insert(messages).values({
                conversationId: conversation.id,
                providerMessageId,
                senderType: 'SYSTEM',
                content: messageContent,
                contentType: 'TEXT',
                status: 'SENT',
                sentAt: new Date(),
            });
        });
    } catch (error) {
        console.error('[Campaign] Erro ao criar conversa/mensagem:', error);
        // Não lançar erro para não interromper o fluxo da campanha
    }
}

// Helper para determinar se um erro é transiente (retryable)
function isTransientError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code || error?.response?.status;
    
    // Network errors transientes
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('econnreset') || 
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('network') ||
        errorMessage.includes('socket hang up')) {
        return true;
    }
    
    // HTTP 5xx errors (server-side transientes)
    if (errorCode >= 500 && errorCode < 600) {
        return true;
    }
    
    // Rate limit temporário (429)
    if (errorCode === 429) {
        return true;
    }
    
    // Erros permanentes: 4xx (exceto 429), invalid params, etc
    return false;
}

// Helper para retry com exponential backoff
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 2000
): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Se não é transiente ou última tentativa, falha imediatamente
            if (!isTransientError(error) || attempt === maxRetries) {
                throw error;
            }
            
            // Exponential backoff: 2s → 4s → 8s
            const delayMs = initialDelayMs * Math.pow(2, attempt);
            console.log(`[RETRY] Tentativa ${attempt + 1}/${maxRetries} falhou com erro transiente. Tentando novamente em ${delayMs}ms...`, error);
            await sleep(delayMs);
        }
    }
    
    throw lastError;
}

// Helper para extrair texto do body de um template (message_templates usa components jsonb)
function extractBodyText(template: any): string {
    // Se tem campo body direto (templates legado), usa ele
    if (template.body && typeof template.body === 'string') {
        return template.body;
    }
    
    // Se tem components (message_templates novo), extrai do BODY component
    if (template.components && Array.isArray(template.components)) {
        const bodyComponent = template.components.find((c: any) => c.type === 'BODY');
        if (bodyComponent?.text) {
            return bodyComponent.text;
        }
    }
    
    return '';
}

// Helper para extrair header type de um template
function extractHeaderType(template: any): string | null {
    // Se tem headerType direto (templates legado), usa ele
    if (template.headerType) {
        return template.headerType;
    }
    
    // Se tem components (message_templates novo), extrai do HEADER component
    if (template.components && Array.isArray(template.components)) {
        const headerComponent = template.components.find((c: any) => c.type === 'HEADER');
        if (headerComponent?.format) {
            return headerComponent.format;
        }
    }
    
    return null;
}

// Helper para resolver template de ambas tabelas e normalizar estrutura
interface ResolvedTemplate {
    name: string;
    language: string;
    bodyText: string;
    headerType: string | null;
    hasMedia: boolean;
}

function resolveTemplate(template: any): ResolvedTemplate {
    const bodyText = extractBodyText(template);
    const headerType = extractHeaderType(template);
    const hasMedia = headerType ? ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) : false;
    
    return {
        name: template.name,
        language: template.language,
        bodyText,
        headerType,
        hasMedia,
    };
}

// ==========================================
// WHATSAPP CAMPAIGN SENDER
// ==========================================

// Interface para retorno do envio de mensagem
interface CampaignMessageResult {
    success: boolean;
    contactId: string;
    providerMessageId?: string | null;
    error?: string;
}

// Sub-função: Enviar via Baileys
async function sendViaBaileys(
    connectionId: string,
    contact: typeof contacts.$inferSelect,
    resolvedTemplate: ResolvedTemplate,
    variableMappings: Record<string, { type: 'dynamic' | 'fixed'; value: string }>
): Promise<CampaignMessageResult> {
    if (!baileysSessionManager) {
        console.error('[Campaign-Baileys] SessionManager do Baileys não está disponível');
        return {
            success: false,
            contactId: contact.id,
            error: 'SessionManager do Baileys não está disponível',
        };
    }
    
    // NOVO: Verificar status da sessão ANTES de enviar
    const sessionStatus = baileysSessionManager.getSessionStatus(connectionId);
    console.log(`[Campaign-Baileys] Preparando envio | ConnectionID: ${connectionId} | Status: ${sessionStatus || 'NOT_FOUND'} | Contato: ${contact.phone}`);
    
    if (!sessionStatus || sessionStatus !== 'connected') {
        const errorMsg = sessionStatus ? `Sessão ${sessionStatus} - não está conectada` : 'Sessão não encontrada no SessionManager';
        console.error(`[Campaign-Baileys] ERRO: ${errorMsg} | ConnectionID: ${connectionId}`);
        return {
            success: false,
            contactId: contact.id,
            error: errorMsg,
        };
    }
    
    // Substitui variáveis no body text
    let messageText = resolvedTemplate.bodyText;
    const bodyVariables = messageText.match(/\{\{(\d+)\}\}/g) || [];
    
    for (const placeholder of bodyVariables) {
        const varKey = placeholder.replace(/\{|\}/g, '');
        const mapping = variableMappings[varKey];
        let text = `[variável ${varKey} não mapeada]`;
        
        if (mapping) {
            if (mapping.type === 'fixed') {
                text = mapping.value;
            } else if (mapping.type === 'dynamic') {
                const dynamicValue = contact[mapping.value as keyof typeof contact];
                if (dynamicValue !== null && dynamicValue !== undefined) {
                    text = String(dynamicValue);
                } else {
                    text = `[dado ausente]`;
                }
            }
        }
        
        messageText = messageText.replace(placeholder, text);
    }
    
    console.log(`[Campaign-Baileys] Texto final da mensagem: "${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}"`);
    
    try {
        // Envolve com retry logic para erros transientes
        const messageId = await withRetry(async () => {
            return await baileysSessionManager.sendMessage(
                connectionId,
                contact.phone,
                { text: messageText }
            );
        });
        
        if (messageId) {
            console.log(`[Campaign-Baileys] ✅ Mensagem enviada com sucesso | Contato: ${contact.phone} | MessageID: ${messageId}`);
            return {
                success: true,
                contactId: contact.id,
                providerMessageId: messageId,
            };
        } else {
            console.error(`[Campaign-Baileys] ❌ Baileys retornou null | Contato: ${contact.phone} | ConnectionID: ${connectionId}`);
            return {
                success: false,
                contactId: contact.id,
                error: 'Baileys retornou null - sessão pode ter caído durante o envio',
            };
        }
    } catch (error) {
        console.error(`[Campaign-Baileys] ❌ Exceção ao enviar | Contato: ${contact.phone} | Erro: ${(error as Error).message}`);
        return {
            success: false,
            contactId: contact.id,
            error: (error as Error).message,
        };
    }
}

// Sub-função: Enviar via Meta API (código atual refatorado)
async function sendViaMetaApi(
    connection: typeof connections.$inferSelect,
    contact: typeof contacts.$inferSelect,
    resolvedTemplate: ResolvedTemplate,
    variableMappings: Record<string, { type: 'dynamic' | 'fixed'; value: string }>,
    campaign: typeof campaigns.$inferSelect
): Promise<CampaignMessageResult> {
    try {
        const bodyVariables = resolvedTemplate.bodyText.match(/\{\{(\d+)\}\}/g) || [];
        
        const bodyParams = bodyVariables.map(placeholder => {
            const varKey = placeholder.replace(/\{|\}/g, '');
            const mapping = variableMappings[varKey];
            let text = `[variável ${varKey} não mapeada]`;
            
            if (mapping) {
                if (mapping.type === 'fixed') {
                    text = mapping.value;
                } else if (mapping.type === 'dynamic') {
                    const dynamicValue = contact[mapping.value as keyof typeof contact];
                    if (dynamicValue !== null && dynamicValue !== undefined) {
                        text = String(dynamicValue);
                    } else {
                        text = `[dado ausente]`;
                    }
                }
            }
            return { type: 'text', text };
        });
        
        const components: Record<string, unknown>[] = [];
        
        if (resolvedTemplate.hasMedia && campaign.mediaAssetId) {
            if (!connection.wabaId) throw new Error(`Conexão ${connection.config_name} não possui WABA ID configurado.`);
            const { handle, asset } = await getMediaData(campaign.mediaAssetId, connection.id, connection.wabaId);
            const headerType = resolvedTemplate.headerType!.toLowerCase() as 'image' | 'video' | 'document';
            const mediaObject: { id: string; filename?: string } = { id: handle };
            if (headerType === 'document' && asset.name) {
                mediaObject.filename = asset.name;
            }
            components.push({ type: 'header', parameters: [{ type: headerType, [headerType]: mediaObject }] });
        }
        
        if (bodyParams.length > 0) {
            components.push({ type: 'body', parameters: bodyParams });
        }
        
        // Envolve com retry logic para erros transientes (5xx, timeout, network)
        const response = await withRetry(async () => {
            return await sendWhatsappTemplateMessage({
                connection,
                to: contact.phone,
                templateName: resolvedTemplate.name,
                languageCode: resolvedTemplate.language,
                components,
            });
        });
        
        return {
            success: true,
            contactId: contact.id,
            providerMessageId: (response as unknown as MetaApiMessageResponse).messages?.[0]?.id || null,
        };
        
    } catch (error) {
        return {
            success: false,
            contactId: contact.id,
            error: (error as Error).message,
        };
    }
}

// Wrapper unificado: Detecta tipo de conexão e delega para sub-função apropriada
async function sendCampaignMessage(
    connection: typeof connections.$inferSelect,
    contact: typeof contacts.$inferSelect,
    resolvedTemplate: ResolvedTemplate,
    variableMappings: Record<string, { type: 'dynamic' | 'fixed'; value: string }>,
    campaign: typeof campaigns.$inferSelect
): Promise<CampaignMessageResult> {
    const isBaileys = connection.connectionType === 'baileys';
    
    // Bloqueio de campanhas com mídia para Baileys
    if (isBaileys && resolvedTemplate.hasMedia && campaign.mediaAssetId) {
        return {
            success: false,
            contactId: contact.id,
            error: 'Campanhas com mídia não são suportadas em conexões Baileys. Use Meta Cloud API.',
        };
    }
    
    if (isBaileys) {
        return sendViaBaileys(connection.id, contact, resolvedTemplate, variableMappings);
    } else {
        return sendViaMetaApi(connection, contact, resolvedTemplate, variableMappings, campaign);
    }
}

async function getMediaData(assetId: string, connectionId: string, wabaId: string): Promise<{ handle: string; asset: MediaAssetType }> {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, assetId));
    if (!asset) {
        throw new Error(`Media Asset com ID ${assetId} não encontrado.`);
    }

    const existingHandles = (asset.metaHandles || []) as MetaHandle[];
    const existingHandle = existingHandles.find(h => h.wabaId === wabaId);
    if (existingHandle) {
        return { handle: existingHandle.handle, asset: asset as MediaAssetType };
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:9002' : '');
    if (!baseUrl) {
        throw new Error("A variável de ambiente NEXT_PUBLIC_BASE_URL não está configurada.");
    }
    
    const handleResponse = await fetch(`${baseUrl}/api/v1/media/${assetId}/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
        signal: AbortSignal.timeout(15000), // Timeout de 15s
    });

    const handleData = await handleResponse.json() as { error?: string, handle?: string };
    if (!handleResponse.ok || !handleData.handle) {
        throw new Error(handleData.error || 'Falha ao obter o media handle da Meta.');
    }
    return { handle: handleData.handle, asset: asset as MediaAssetType };
}


export async function sendWhatsappCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
    // 1. Marcar a campanha como 'SENDING'
    await db.update(campaigns).set({ status: 'SENDING' }).where(eq(campaigns.id, campaign.id));

    try {
        if (!campaign.companyId) throw new Error(`Campanha ${campaign.id} não tem companyId.`);
        if (!campaign.connectionId) throw new Error(`Campanha ${campaign.id} não tem connectionId.`);
        
        // Validação dual-path: precisa de template OU mensagem direta
        if (!campaign.templateId && !campaign.message) {
            throw new Error(`Campanha ${campaign.id} deve ter templateId ou message definido.`);
        }
        
        if (!campaign.contactListIds || campaign.contactListIds.length === 0) {
            if (process.env.NODE_ENV !== 'production') console.debug(`Campanha ${campaign.id} concluída: sem listas de contatos.`);
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            return;
        }

        // Buscar conexão primeiro para detectar tipo
        const [connection] = await db.select().from(connections).where(eq(connections.id, campaign.connectionId));
        if (!connection) throw new Error(`Conexão ID ${campaign.connectionId} não encontrada.`);
        
        // Runtime guard: Baileys não pode ter mídia
        const isBaileys = connection.connectionType === 'baileys';
        if (isBaileys && campaign.mediaAssetId) {
            throw new Error(`Campanha ${campaign.id} usa conexão Baileys mas possui mídia anexada. Remova a mídia ou use Meta Cloud API.`);
        }

        let resolvedTemplate: ResolvedTemplate;

        // Path A: Campanha baseada em template (Meta API ou Baileys legado)
        if (campaign.templateId) {
            // Tenta buscar o template na tabela templates (legado) e message_templates (novo)
            let template = (await db.select().from(templates).where(eq(templates.id, campaign.templateId)))[0];
            if (!template) {
                // Tenta buscar na tabela message_templates
                template = (await db.select().from(messageTemplates).where(eq(messageTemplates.id, campaign.templateId)))[0] as any;
            }
            if (!template) throw new Error(`Template ID ${campaign.templateId} não encontrado.`);
            
            resolvedTemplate = resolveTemplate(template);
            
            // Valida mídia para Meta API
            if (!isBaileys && resolvedTemplate.hasMedia && !campaign.mediaAssetId) {
                throw new Error(`Campanha ${campaign.id} exige um anexo de mídia, mas nenhum foi fornecido.`);
            }
        } 
        // Path B: Campanha de mensagem direta (Baileys sem template)
        else {
            resolvedTemplate = {
                name: 'direct_message',
                language: 'und',
                bodyText: campaign.message!,
                headerType: null,
                hasMedia: false,
            };
        }
        
        const contactIdsSubquery = db
            .select({ contactId: contactsToContactLists.contactId })
            .from(contactsToContactLists)
            .where(inArray(contactsToContactLists.listId, campaign.contactListIds));
            
        const campaignContacts = await db
            .select()
            .from(contacts)
            .where(inArray(contacts.id, contactIdsSubquery));

        if (campaignContacts.length === 0) {
            if (process.env.NODE_ENV !== 'production') console.debug(`Campanha ${campaign.id} concluída: sem contatos nas listas.`);
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            return;
        }

        const batchSize = campaign.batchSize || 100; // Padrão de 100
        const batchDelaySeconds = campaign.batchDelaySeconds || 5; // Padrão de 5 segundos

        const contactBatches = chunkArray(campaignContacts, batchSize);

        for (const [index, batch] of contactBatches.entries()) {
            // Verificar se a campanha foi pausada antes de processar o próximo lote
            const [currentCampaign] = await db.select({ status: campaigns.status }).from(campaigns).where(eq(campaigns.id, campaign.id));
            if (currentCampaign?.status === 'PAUSED') {
                console.log(`[Campanha WhatsApp ${campaign.id}] Campanha pausada pelo usuário. Interrompendo envio.`);
                return; // Sai da função sem marcar como completa ou falha
            }

            console.log(`[Campanha WhatsApp ${campaign.id}] Processando lote ${index + 1}/${contactBatches.length} com ${batch.length} contatos.`);

            const variableMappings = campaign.variableMappings as Record<string, { type: 'dynamic' | 'fixed', value: string }> || {};

            // Usa o wrapper unificado para enviar mensagens
            const sendPromises = batch.map(contact => 
                sendCampaignMessage(connection, contact, resolvedTemplate, variableMappings, campaign)
            );

            const results = await Promise.allSettled(sendPromises);

            // Mapeia resultados para delivery reports
            const deliveryReports = results.map(result => {
                if (result.status === 'fulfilled') {
                    const value = result.value;
                    if (value.success) {
                        return {
                            campaignId: campaign.id,
                            contactId: value.contactId,
                            connectionId: campaign.connectionId!,
                            status: 'SENT',
                            providerMessageId: value.providerMessageId || null,
                        };
                    } else {
                        return {
                            campaignId: campaign.id,
                            contactId: value.contactId,
                            connectionId: campaign.connectionId!,
                            status: 'FAILED',
                            failureReason: value.error || 'Erro desconhecido',
                        };
                    }
                } else {
                    // Promise rejeitada
                    return {
                        campaignId: campaign.id,
                        contactId: 'unknown',
                        connectionId: campaign.connectionId!,
                        status: 'FAILED',
                        failureReason: (result.reason as Error)?.message || 'Erro desconhecido',
                    };
                }
            }).filter(Boolean);

            if (deliveryReports.length > 0) {
                 await db.insert(whatsappDeliveryReports).values(deliveryReports as any);
                 
                 // Criar conversas e mensagens para envios bem-sucedidos
                 const successfulReports = deliveryReports.filter(r => r.status.toUpperCase() === 'SENT');
                 if (successfulReports.length > 0) {
                     console.log(`[Campaign] Criando conversas/mensagens para ${successfulReports.length} envios bem-sucedidos`);
                     const conversationPromises = successfulReports.map(report => {
                         const messageContent = resolvedTemplate.name !== 'direct_message'
                             ? `Template: ${resolvedTemplate.name}`
                             : resolvedTemplate.bodyText;
                         
                         return createCampaignConversationAndMessage(
                             campaign.companyId!,
                             report.contactId,
                             report.connectionId,
                             report.providerMessageId || null,
                             messageContent,
                             campaign.id
                         );
                     });
                     
                     // Executa todas as criações em paralelo mas não falha se alguma der erro
                     const results = await Promise.allSettled(conversationPromises);
                     const failed = results.filter(r => r.status === 'rejected').length;
                     const succeeded = results.filter(r => r.status === 'fulfilled').length;
                     console.log(`[Campaign] Conversas/mensagens criadas: ${succeeded} sucessos, ${failed} falhas`);
                 }
            }

            if (index < contactBatches.length - 1) {
                console.log(`[Campanha WhatsApp ${campaign.id}] Pausando por ${batchDelaySeconds} segundos...`);
                await sleep(batchDelaySeconds * 1000);
            }
        }
        
        await db.update(campaigns).set({ status: 'COMPLETED', sentAt: new Date(), completedAt: new Date() }).where(eq(campaigns.id, campaign.id));

        const allDeliveryReports = await db
          .select()
          .from(whatsappDeliveryReports)
          .where(eq(whatsappDeliveryReports.campaignId, campaign.id));

        const deliveredCount = allDeliveryReports.filter(r => r.status === 'SENT').length;
        const totalSent = campaignContacts.length;
        const deliveryRate = totalSent > 0 ? (deliveredCount / totalSent * 100) : 0;

        NotificationService.safeNotify(
          NotificationService.notifyCampaignSent,
          'CampaignSender',
          campaign.companyId!,
          {
            name: campaign.name || 'Campanha sem nome',
            channel: 'whatsapp',
            sent: totalSent,
            delivered: deliveredCount,
            rate: deliveryRate,
          }
        );

        // Criar notificação in-app para campanha concluída
        try {
          await UserNotificationsService.notifyCampaignCompleted(
            campaign.companyId!,
            campaign.id,
            campaign.name || 'Campanha sem nome',
            totalSent
          );
          console.log(`[UserNotifications] Campaign completed notification sent for ${campaign.id}`);
        } catch (notifError) {
          console.error('[UserNotifications] Error sending campaign notification:', notifError);
        }

        try {
          console.log(`[Webhook] Dispatching campaign_sent for campaign ${campaign.id}`);
          await webhookDispatcher.dispatch(campaign.companyId!, 'campaign_sent', {
            campaignId: campaign.id,
            campaignName: campaign.name || 'Campanha sem nome',
            totalSent: totalSent,
            totalDelivered: deliveredCount,
          });
        } catch (webhookError) {
          console.error('[Webhook] Error dispatching campaign_sent:', webhookError);
        }

    } catch(error) {
        console.error(`Falha crítica ao enviar campanha de WhatsApp ${campaign.id}:`, error);
        await db.update(campaigns).set({ status: 'FAILED' }).where(eq(campaigns.id, campaign.id));
        throw error;
    }
}


// ==========================================
// SMS CAMPAIGN SENDER
// ==========================================

const VALID_SUCCESS_STATUSES = new Set(['SENT', 'SUCCESS', 'DELIVERED', 'ACCEPTED', 'OK']);
const VALID_PENDING_STATUSES = new Set(['PENDING', 'QUEUED', 'SCHEDULED', 'PROCESSING']);

function normalizeDeliveryStatus(rawStatus: string | undefined | null): 'SENT' | 'FAILED' | 'PENDING' {
    // Se não há status explícito, é FAILED (não assumir sucesso sem confirmação)
    if (!rawStatus) {
        return 'FAILED';
    }
    const upper = rawStatus.toUpperCase();
    if (VALID_SUCCESS_STATUSES.has(upper)) {
        return 'SENT';
    }
    if (VALID_PENDING_STATUSES.has(upper)) {
        return 'PENDING';
    }
    // Status desconhecido = FAILED
    return 'FAILED';
}

async function logSmsDelivery(campaign: typeof campaigns.$inferSelect, gateway: typeof smsGateways.$inferSelect, contacts: { id: string, phone: string }[], providerResponse: { success: boolean, mensagens?: { Codigo_cliente: string, id_mensagem: string, status?: string, error?: string }[], error?: string } & Record<string, unknown>): Promise<void> {
    const logs = contacts.map(contact => {
        const msgInfo = providerResponse.mensagens?.find(m => m.Codigo_cliente === contact.id);
        
        // Se o contato não está no retorno do provider, é FAILED (não recebeu confirmação)
        if (!msgInfo) {
            return {
                campaignId: campaign.id,
                contactId: contact.id,
                smsGatewayId: gateway.id,
                status: 'FAILED' as const,
                failureReason: providerResponse.error || 'Contato não encontrado na resposta do provider',
                providerMessageId: null,
            };
        }
        
        const status = normalizeDeliveryStatus(msgInfo.status);
        const isFailed = status === 'FAILED';
        
        let failureReason: string | null = null;
        if (isFailed) {
            failureReason = msgInfo.error || providerResponse.error || 'Status de envio não confirmado';
        }
        
        return {
            campaignId: campaign.id,
            contactId: contact.id,
            smsGatewayId: gateway.id,
            status,
            failureReason,
            providerMessageId: msgInfo.id_mensagem || null,
        };
    });

    if (logs.length > 0) {
        await db.insert(smsDeliveryReports).values(logs);
    }
}

async function sendSmsBatch(gateway: typeof smsGateways.$inferSelect, campaign: typeof campaigns.$inferSelect, batch: { id: string, phone: string }[]): Promise<Record<string, unknown>> {
    const provider = gateway.provider as 'witi' | 'seven' | 'mkom';
    const credentials = gateway.credentials as Record<string, string> | null;
    
    // Normalize all phone numbers for Brazilian SMS format
    const normalizedBatch = batch.map(contact => {
        const normalized = normalizeBrazilianSMS(contact.phone);
        if (normalized.ninthDigitAdded) {
            console.log(`[SMS] 📱 Nono dígito adicionado: ${normalized.original} → ${normalized.number}`);
        }
        if (!normalized.valid) {
            console.warn(`[SMS] ⚠️ Número inválido: ${contact.phone} - ${normalized.error}`);
        }
        return {
            ...contact,
            originalPhone: contact.phone,
            phone: normalized.number,
            phoneValid: normalized.valid,
            phoneError: normalized.error
        };
    });
    
    // Filter valid numbers only
    const validBatch = normalizedBatch.filter(c => c.phoneValid);
    const invalidCount = normalizedBatch.length - validBatch.length;
    
    if (invalidCount > 0) {
        console.warn(`[SMS] ⚠️ ${invalidCount} número(s) inválido(s) serão ignorados`);
    }
    
    if (validBatch.length === 0) {
        throw new Error('Nenhum número válido para enviar SMS');
    }

    switch(provider) {
        case 'witi': {
            // Check circuit breaker before making request
            if (CircuitBreaker.isOpen('sms_witi')) {
                throw new Error('Witi SMS gateway temporariamente indisponível devido a falhas recentes. Tente novamente em alguns minutos.');
            }
            
            if (!credentials || !credentials.token) {
                throw new Error("Credenciais 'token' ausentes para o gateway Witi.");
            }
            const apiKey = decrypt(credentials.token);
            if (!apiKey) throw new Error("Falha ao desencriptar o API Key da Witi.");
            
            const messages = validBatch.map(contact => ({ numero: contact.phone, mensagem: campaign.message!, Codigo_cliente: contact.id }));
            const payload = { tipo_envio: "common", referencia: campaign.name, mensagens: messages };
            const url = `https://sms.witi.me/sms/send.aspx?chave=${apiKey}`;
            
            try {
                const response = await fetch(url, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(15000) // Timeout de 15s
                });
                const responseText = await response.text();
                
                if (!response.ok) {
                    CircuitBreaker.recordFailure('sms_witi');
                    throw new Error(`Witi API Error: ${responseText}`);
                }
                
                CircuitBreaker.recordSuccess('sms_witi');
                
                try {
                    const data = JSON.parse(responseText) as { status: string };
                    return { success: data.status !== 'ERRO', ...data };
                } catch(e) {
                    return { success: true, details: responseText };
                }
            } catch (error) {
                CircuitBreaker.recordFailure('sms_witi');
                throw error;
            }
        }
        
        case 'seven': {
            // Check circuit breaker before making request
            if (CircuitBreaker.isOpen('sms_seven')) {
                throw new Error('Seven.io SMS gateway temporariamente indisponível devido a falhas recentes. Tente novamente em alguns minutos.');
            }
            
            if (!credentials || !credentials.apiKey) {
                throw new Error("Credenciais 'apiKey' ausentes para o gateway seven.io.");
            }
            const sevenApiKey = decrypt(credentials.apiKey);
            if (!sevenApiKey) throw new Error("Falha ao desencriptar a API Key da seven.io.");
            
            const toNumbers = validBatch.map(c => c.phone).join(',');
            const sevenPayload = { to: toNumbers, text: campaign.message!, from: "ZAPMaster" };
            const sevenUrl = 'https://gateway.seven.io/api/sms';
            
            try {
                const sevenResponse = await fetch(sevenUrl, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': sevenApiKey }, 
                    body: JSON.stringify(sevenPayload),
                    signal: AbortSignal.timeout(15000) // Timeout de 15s
                });
                const sevenResponseText = await sevenResponse.text();

                if (!sevenResponse.ok) {
                    CircuitBreaker.recordFailure('sms_seven');
                    throw new Error(`Seven.io API Error: Status ${sevenResponse.status} - ${sevenResponseText}`);
                }
                
                CircuitBreaker.recordSuccess('sms_seven');
                
                try {
                    return { success: true, ...JSON.parse(sevenResponseText) } as Record<string, unknown>;
                } catch (e) {
                    return { success: true, details: sevenResponseText };
                }
            } catch (error) {
                CircuitBreaker.recordFailure('sms_seven');
                throw error;
            }
        }

        case 'mkom': {
            // Check circuit breaker before making request
            if (CircuitBreaker.isOpen('sms_mkom')) {
                throw new Error('MKOM SMS gateway temporariamente indisponível devido a falhas recentes. Tente novamente em alguns minutos.');
            }
            
            if (!credentials || !credentials.token) {
                throw new Error("Credenciais 'token' ausentes para o gateway MKOM.");
            }
            const mkomToken = decrypt(credentials.token);
            if (!mkomToken) throw new Error("Falha ao desencriptar o Token JWT da MKOM.");
            
            // Obter cost_centre_id das credenciais (opcional, padrão: 0)
            const costCentreId = credentials.cost_centre_id ? parseInt(credentials.cost_centre_id) : 0;
            
            // MKOM API - Envio de SMS via MKSMS
            // Documentação oficial: https://sms.mkmservice.com/sms/api/transmission/v1
            // Números devem estar no formato E.164 com DDI (ex: 5511999999999)
            const mkomMessages = validBatch.map(contact => {
                // Garantir formato E.164: não duplicar DDI se já existir
                let msisdn = contact.phone.replace(/\D/g, ''); // Remove não-numéricos
                if (!msisdn.startsWith('55')) {
                    msisdn = `55${msisdn}`;
                }
                return {
                    msisdn,
                    message: campaign.message!,
                    schedule: null, // Envio imediato
                    reference: contact.id // ID do contato como referência
                };
            });
            
            console.log(`[SMS MKOM] Enviando ${mkomMessages.length} mensagens via MKSMS API`);
            console.log(`[SMS MKOM] 📤 Payload Preview:`, JSON.stringify(mkomMessages.slice(0, 2).map(m => ({ 
                msisdn: m.msisdn, 
                message: m.message.substring(0, 30) + '...',
                reference: m.reference
            })), null, 2));
            
            // Payload conforme documentação MKOM MKSMS
            const mkomPayload = {
                mailing: {
                    identifier: `MasterIA-Campaign-${campaign.id}`,
                    cost_centre_id: costCentreId
                },
                messages: mkomMessages
            };
            
            // Endpoint oficial MKOM MKSMS
            const mkomUrl = 'https://sms.mkmservice.com/sms/api/transmission/v1';
            
            try {
                console.log(`[SMS MKOM] 🌐 Chamando API: POST ${mkomUrl}`);
                const startTime = Date.now();
                
                const mkomResponse = await fetch(mkomUrl, { 
                    method: 'POST', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${mkomToken}`
                    }, 
                    body: JSON.stringify(mkomPayload),
                    signal: AbortSignal.timeout(30000) // Timeout de 30s para lotes maiores
                });
                const mkomResponseText = await mkomResponse.text();
                const elapsed = Date.now() - startTime;
                
                console.log(`[SMS MKOM] 📥 Response Status: ${mkomResponse.status} (${elapsed}ms)`);
                console.log(`[SMS MKOM] 📥 Response Body:`, mkomResponseText);

                if (!mkomResponse.ok) {
                    console.error(`[SMS MKOM] ❌ API Error: Status ${mkomResponse.status}`);
                    CircuitBreaker.recordFailure('sms_mkom');
                    throw new Error(`MKOM API Error: Status ${mkomResponse.status} - ${mkomResponseText}`);
                }
                
                CircuitBreaker.recordSuccess('sms_mkom');
                console.log(`[SMS MKOM] ✅ Envio bem-sucedido!`);
                
                try {
                    // Formato de resposta MKOM: { mailing: { id: "..." }, messages: [{ success: boolean, reference: "...", id?: "..." }] }
                    const mkomData = JSON.parse(mkomResponseText) as { 
                        mailing?: { id: string }; 
                        messages?: Array<{ success?: boolean; reference?: string; id?: string; status?: string; error?: string }>;
                        error?: string;
                        status?: string;
                    };
                    console.log(`[SMS MKOM] 📊 Parsed Response:`, JSON.stringify(mkomData, null, 2));
                    
                    // Verificar se houve erro global
                    if (mkomData.error || mkomData.status === 'ERROR' || mkomData.status === 'ERRO') {
                        const errorMsg = mkomData.error || 'Erro desconhecido da API MKOM';
                        console.error(`[SMS MKOM] ❌ Erro global da API: ${errorMsg}`);
                        CircuitBreaker.recordFailure('sms_mkom');
                        return { success: false, error: errorMsg, mensagens: [] };
                    }
                    
                    // Validar estrutura mínima da resposta - MKOM deve retornar array messages
                    if (!mkomData.messages || !Array.isArray(mkomData.messages)) {
                        // Sem array de mensagens: tratar como falha (estrutura inesperada)
                        console.error(`[SMS MKOM] ❌ Resposta sem array 'messages' válido - estrutura inesperada`);
                        CircuitBreaker.recordFailure('sms_mkom');
                        return { 
                            success: false, 
                            error: 'Estrutura de resposta MKOM inválida: campo messages ausente',
                            mensagens: validBatch.map(c => ({
                                Codigo_cliente: c.id,
                                id_mensagem: '',
                                status: 'FAILED',
                                error: 'Resposta MKOM sem confirmação de entrega'
                            }))
                        };
                    }
                    
                    // Validar se messages tem pelo menos um item
                    if (mkomData.messages.length === 0) {
                        console.error(`[SMS MKOM] ❌ Array 'messages' vazio na resposta`);
                        CircuitBreaker.recordFailure('sms_mkom');
                        return { 
                            success: false, 
                            error: 'MKOM retornou array de mensagens vazio',
                            mensagens: validBatch.map(c => ({
                                Codigo_cliente: c.id,
                                id_mensagem: '',
                                status: 'FAILED',
                                error: 'MKOM não confirmou entrega'
                            }))
                        };
                    }
                    
                    // Processar cada mensagem com validação rigorosa de tipos
                    let hasInvalidStructure = false;
                    const processedMessages = mkomData.messages.map(m => {
                        // Validar que reference é string não vazia
                        if (!m.reference || typeof m.reference !== 'string') {
                            console.warn(`[SMS MKOM] ⚠️ Mensagem sem reference válido`);
                            hasInvalidStructure = true;
                        }
                        
                        // Determinar sucesso: DEVE ter confirmação explícita
                        // Sem success boolean ou status string válido = FAILED
                        let isSuccess = false;
                        let statusStr: string | undefined;
                        
                        if (typeof m.success === 'boolean') {
                            // Campo success boolean explícito
                            isSuccess = m.success;
                            statusStr = m.success ? 'SENT' : 'FAILED';
                        } else if (m.status && typeof m.status === 'string') {
                            // Campo status string - validar contra lista conhecida
                            const statusUpper = m.status.toUpperCase();
                            if (VALID_SUCCESS_STATUSES.has(statusUpper)) {
                                isSuccess = true;
                                statusStr = 'SENT';
                            } else if (VALID_PENDING_STATUSES.has(statusUpper)) {
                                isSuccess = true; // Pending ainda conta como sucesso no envio
                                statusStr = 'PENDING';
                            } else {
                                // Status desconhecido = falha
                                isSuccess = false;
                                statusStr = 'FAILED';
                                console.warn(`[SMS MKOM] ⚠️ Status desconhecido: ${m.status}`);
                            }
                        } else {
                            // Sem success nem status = SEM CONFIRMAÇÃO = FAILED
                            isSuccess = false;
                            statusStr = 'FAILED';
                        }
                        
                        return {
                            reference: m.reference || '',
                            success: isSuccess,
                            status: statusStr,
                            id: m.id,
                            error: m.error
                        };
                    });
                    
                    // Se estrutura inválida em muitas mensagens, é problema sério
                    if (hasInvalidStructure && processedMessages.length > 0) {
                        const invalidRatio = processedMessages.filter(m => !m.reference).length / processedMessages.length;
                        if (invalidRatio > 0.5) {
                            console.error(`[SMS MKOM] ❌ Mais de 50% das mensagens sem reference válido`);
                            CircuitBreaker.recordFailure('sms_mkom');
                        }
                    }
                    
                    const successCount = processedMessages.filter(m => m.success).length;
                    const failCount = processedMessages.filter(m => !m.success).length;
                    
                    if (failCount > 0) {
                        console.warn(`[SMS MKOM] ⚠️ ${failCount} mensagem(ns) falharam, ${successCount} enviadas com sucesso`);
                    }
                    
                    // Mapear resposta para formato compatível com logSmsDelivery
                    const mensagens = processedMessages.map(m => ({
                        Codigo_cliente: m.reference,
                        id_mensagem: m.id || mkomData.mailing?.id || '',
                        status: m.status || 'FAILED',
                        error: m.error
                    }));
                    
                    // Determinar sucesso global
                    const allSuccess = failCount === 0 && successCount > 0;
                    const partialSuccess = failCount > 0 && successCount > 0;
                    
                    // Acionar circuit breaker apenas quando todas falham
                    if (failCount > 0 && successCount === 0) {
                        CircuitBreaker.recordFailure('sms_mkom');
                    }
                    
                    return { 
                        success: allSuccess || partialSuccess,
                        partialSuccess,
                        mailingId: mkomData.mailing?.id,
                        mensagens,
                        successCount,
                        failCount
                    };
                } catch (e) {
                    // JSON inválido: tratar como falha e acionar circuit breaker
                    console.error(`[SMS MKOM] ❌ Response não é JSON válido:`, mkomResponseText);
                    CircuitBreaker.recordFailure('sms_mkom');
                    return { 
                        success: false, 
                        error: 'Resposta inválida da API MKOM', 
                        details: mkomResponseText,
                        mensagens: validBatch.map(c => ({
                            Codigo_cliente: c.id,
                            id_mensagem: '',
                            status: 'FAILED',
                            error: 'Resposta inválida da API'
                        }))
                    };
                }
            } catch (error) {
                console.error(`[SMS MKOM] ❌ Erro na requisição:`, (error as Error).message);
                CircuitBreaker.recordFailure('sms_mkom');
                throw error;
            }
        }
        
        default:
            throw new Error(`Provedor de SMS "${gateway.provider}" não suportado.`);
    }
}

export async function sendSmsCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
    await db.update(campaigns).set({ status: 'SENDING' }).where(eq(campaigns.id, campaign.id));
    
    try {
        if (!campaign.companyId) throw new Error(`Campaign ${campaign.id} is missing companyId.`);
        if (!campaign.message) throw new Error(`Campaign ${campaign.id} has no message content.`);
        if (!campaign.contactListIds || campaign.contactListIds.length === 0) {
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            if (process.env.NODE_ENV !== 'production') console.debug(`Campanha ${campaign.id} concluída: sem listas de contatos.`);
            return;
        }
        if (!campaign.smsGatewayId) throw new Error(`Campaign ${campaign.id} is missing an assigned SMS Gateway.`);

        const [gateway] = await db.select().from(smsGateways).where(eq(smsGateways.id, campaign.smsGatewayId));
        if (!gateway) throw new Error(`Gateway ID ${campaign.smsGatewayId} not found for campaign ${campaign.id}.`);
        
        const contactIdsSubquery = db.select({ contactId: contactsToContactLists.contactId }).from(contactsToContactLists).where(inArray(contactsToContactLists.listId, campaign.contactListIds));
        const campaignContacts = await db.selectDistinct({ phone: contacts.phone, id: contacts.id }).from(contacts).where(inArray(contacts.id, contactIdsSubquery));

        if (campaignContacts.length === 0) {
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            if (process.env.NODE_ENV !== 'production') console.debug(`Campanha ${campaign.id} concluída: sem contatos nas listas selecionadas.`);
            return;
        }

        const batchSize = campaign.batchSize || 100;
        const batchDelaySeconds = campaign.batchDelaySeconds || 5;
        const contactBatches = chunkArray(campaignContacts, batchSize);

        for (const [index, batch] of contactBatches.entries()) {
            // Verificar se a campanha foi pausada antes de processar o próximo lote
            const [currentCampaign] = await db.select({ status: campaigns.status }).from(campaigns).where(eq(campaigns.id, campaign.id));
            if (currentCampaign?.status === 'PAUSED') {
                console.log(`[Campanha SMS ${campaign.id}] Campanha pausada pelo usuário. Interrompendo envio.`);
                return; // Sai da função sem marcar como completa ou falha
            }

            console.log(`[Campanha SMS ${campaign.id}] Processando lote ${index + 1}/${contactBatches.length} com ${batch.length} contatos.`);
            try {
                const providerResponse = await sendSmsBatch(gateway, campaign, batch);
                await logSmsDelivery(campaign, gateway, batch, providerResponse as any);
            } catch (error) {
                console.error(`[Campanha SMS ${campaign.id}] Erro no lote ${index + 1}:`, error);
                await logSmsDelivery(campaign, gateway, batch, { success: false, error: (error as Error).message });
            }

             if (index < contactBatches.length - 1) {
                console.log(`[Campanha SMS ${campaign.id}] Pausando por ${batchDelaySeconds} segundos...`);
                await sleep(batchDelaySeconds * 1000);
            }
        }
        
        await db.update(campaigns).set({ status: 'COMPLETED', sentAt: new Date(), completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
    
    } catch (error) {
        console.error(`Falha crítica ao enviar campanha SMS ${campaign.id}:`, error);
        await db.update(campaigns).set({ status: 'FAILED' }).where(eq(campaigns.id, campaign.id));
        throw error;
    }
}
