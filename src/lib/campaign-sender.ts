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
    messageTemplates
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decrypt } from './crypto';
import { sendWhatsappTemplateMessage } from './facebookApiService';
import type { MediaAsset as MediaAssetType, MetaApiMessageResponse, MetaHandle } from './types';
import { sessionManager as baileysSessionManager } from '@/services/baileys-session-manager';
import { NotificationService } from '@/lib/notifications/notification-service';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';

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
        return {
            success: false,
            contactId: contact.id,
            error: 'SessionManager do Baileys não está disponível',
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
            return {
                success: true,
                contactId: contact.id,
                providerMessageId: messageId,
            };
        } else {
            return {
                success: false,
                contactId: contact.id,
                error: 'Baileys retornou null - possível sessão desconectada',
            };
        }
    } catch (error) {
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
                connectionId: connection.id,
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

async function logSmsDelivery(campaign: typeof campaigns.$inferSelect, gateway: typeof smsGateways.$inferSelect, contacts: { id: string, phone: string }[], providerResponse: { success: boolean, mensagens?: { Codigo_cliente: string, id_mensagem: string }[] } & Record<string, unknown>): Promise<void> {
    const logs = contacts.map(contact => ({
        campaignId: campaign.id,
        contactId: contact.id,
        smsGatewayId: gateway.id,
        status: providerResponse.success ? 'SENT' : 'FAILED',
        failureReason: providerResponse.success ? null : JSON.stringify(providerResponse),
        providerMessageId: providerResponse.mensagens?.find(m => m.Codigo_cliente === contact.id)?.id_mensagem,
    }));

    if (logs.length > 0) {
        await db.insert(smsDeliveryReports).values(logs);
    }
}

async function sendSmsBatch(gateway: typeof smsGateways.$inferSelect, campaign: typeof campaigns.$inferSelect, batch: { id: string, phone: string }[]): Promise<Record<string, unknown>> {
    const provider = gateway.provider as 'witi' | 'seven';
    const credentials = gateway.credentials as Record<string, string> | null;

    switch(provider) {
        case 'witi': {
            if (!credentials || !credentials.token) {
                throw new Error("Credenciais 'token' ausentes para o gateway Witi.");
            }
            const apiKey = decrypt(credentials.token);
            if (!apiKey) throw new Error("Falha ao desencriptar o API Key da Witi.");
            
            const messages = batch.map(contact => ({ numero: contact.phone.replace(/\\D/g, ''), mensagem: campaign.message!, Codigo_cliente: contact.id }));
            const payload = { tipo_envio: "common", referencia: campaign.name, mensagens: messages };
            const url = `https://sms.witi.me/sms/send.aspx?chave=${apiKey}`;
            
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const responseText = await response.text();
            
            if (!response.ok) throw new Error(`Witi API Error: ${responseText}`);
            
            try {
                const data = JSON.parse(responseText) as { status: string };
                return { success: data.status !== 'ERRO', ...data };
            } catch(e) {
                return { success: true, details: responseText };
            }
        }
        
        case 'seven': {
            if (!credentials || !credentials.apiKey) {
                throw new Error("Credenciais 'apiKey' ausentes para o gateway seven.io.");
            }
            const sevenApiKey = decrypt(credentials.apiKey);
            if (!sevenApiKey) throw new Error("Falha ao desencriptar a API Key da seven.io.");
            
            const toNumbers = batch.map(c => c.phone.replace(/\\D/g, '')).join(',');
            const sevenPayload = { to: toNumbers, text: campaign.message!, from: "ZAPMaster" };
            const sevenUrl = 'https://gateway.seven.io/api/sms';
            
            const sevenResponse = await fetch(sevenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': sevenApiKey }, body: JSON.stringify(sevenPayload) });
            const sevenResponseText = await sevenResponse.text();

            if (!sevenResponse.ok) throw new Error(`Seven.io API Error: Status ${sevenResponse.status} - ${sevenResponseText}`);
            
            try {
                return { success: true, ...JSON.parse(sevenResponseText) } as Record<string, unknown>;
            } catch (e) {
                return { success: true, details: sevenResponseText };
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
