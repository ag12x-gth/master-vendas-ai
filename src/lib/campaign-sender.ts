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
    connections
} from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decrypt } from './crypto';
import { sendWhatsappTemplateMessage } from './facebookApiService';
import type { MediaAsset as MediaAssetType, MetaApiMessageResponse, MetaHandle } from './types';

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

// ==========================================
// WHATSAPP CAMPAIGN SENDER
// ==========================================

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
        if (!campaign.templateId) throw new Error(`Campanha ${campaign.id} não tem templateId.`);
        if (!campaign.connectionId) throw new Error(`Campanha ${campaign.id} não tem connectionId.`);
        if (!campaign.contactListIds || campaign.contactListIds.length === 0) {
            if (process.env.NODE_ENV !== 'production') console.debug(`Campanha ${campaign.id} concluída: sem listas de contatos.`);
            await db.update(campaigns).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(campaigns.id, campaign.id));
            return;
        }

        const [template] = await db.select().from(templates).where(eq(templates.id, campaign.templateId));
        if (!template) throw new Error(`Template ID ${campaign.templateId} não encontrado.`);

        const [connection] = await db.select().from(connections).where(eq(connections.id, campaign.connectionId));
        if (!connection) throw new Error(`Conexão ID ${campaign.connectionId} não encontrada.`);

        const requiresMedia = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.headerType || 'NONE');
        if (requiresMedia && !campaign.mediaAssetId) {
            throw new Error(`Campanha ${campaign.id} exige um anexo de mídia, mas nenhum foi fornecido.`);
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

            const sendPromises = batch.map(async (contact) => {
                try {
                    const variableMappings = campaign.variableMappings as Record<string, { type: 'dynamic' | 'fixed', value: string }> || {};
                    const bodyVariables = template.body.match(/\{\{(\d+)\}\}/g) || [];
                    
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
                    if (requiresMedia && campaign.mediaAssetId) {
                        const { handle, asset } = await getMediaData(campaign.mediaAssetId, connection.id, connection.wabaId);
                        const headerType = template.headerType!.toLowerCase() as 'image' | 'video' | 'document';
                        const mediaObject: { id: string; filename?: string } = { id: handle };
                        if (headerType === 'document' && asset.name) {
                            mediaObject.filename = asset.name;
                        }
                        components.push({ type: 'header', parameters: [{ type: headerType, [headerType]: mediaObject }] });
                    }
                    
                    if (bodyParams.length > 0) {
                        components.push({ type: 'body', parameters: bodyParams });
                    }

                    const response = await sendWhatsappTemplateMessage({
                        connectionId: campaign.connectionId!,
                        to: contact.phone,
                        templateName: template.name,
                        languageCode: template.language,
                        components,
                    });
                    
                    return { success: true, contactId: contact.id, response };

                } catch (error) {
                    console.error(`Falha ao enviar para o contato ${contact.id} na campanha ${campaign.id}:`, error);
                    return { success: false, contactId: contact.id, error };
                }
            });

            const results = await Promise.allSettled(sendPromises);

            const deliveryReports = results.map(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    return {
                        campaignId: campaign.id,
                        contactId: result.value.contactId,
                        connectionId: campaign.connectionId!,
                        status: 'SENT',
                        providerMessageId: (result.value.response as unknown as MetaApiMessageResponse).messages?.[0]?.id || null,
                    };
                } else {
                    const error = (result.status === 'rejected' ? result.reason : result.value.error) as Error;
                    const contactId = (result.status === 'rejected' ? 'unknown' : result.value.contactId);
                    return {
                        campaignId: campaign.id,
                        contactId: contactId,
                        connectionId: campaign.connectionId!,
                        status: 'FAILED',
                        failureReason: error.message,
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
