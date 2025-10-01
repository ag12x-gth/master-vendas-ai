
// src/app/api/v1/conversations/start/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { 
    conversations, 
    messages, 
    contacts, 
    templates, 
    connections, 
    mediaAssets, 
    type MetaHandle
} from '@/lib/db/schema';
import type { MediaAsset as MediaAssetType, MetaApiMessageResponse } from '@/lib/types';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { sendWhatsappTemplateMessage } from '@/lib/facebookApiService';
import { z } from 'zod';

const startConversationSchema = z.object({
  contactId: z.string().uuid(),
  connectionId: z.string().uuid(),
  templateId: z.string().uuid(),
  variableMappings: z.record(z.any()),
  mediaAssetId: z.string().uuid().optional().nullable(),
});

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


export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json() as unknown;
        const parsed = startConversationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { contactId, connectionId, templateId, variableMappings, mediaAssetId } = parsed.data;

        // 1. Fetch all necessary data in parallel
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
        const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
        const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));

        if (!contact || contact.companyId !== companyId) throw new Error("Contato não encontrado.");
        if (!template || template.companyId !== companyId) throw new Error("Modelo não encontrado.");
        if (!connection || connection.companyId !== companyId) throw new Error("Conexão não encontrada.");
        
        // 2. Prepare template components
        const bodyVariables = template.body.match(/\{\{(\d+)\}\}/g) || [];
        const bodyParams = bodyVariables.map(placeholder => {
            const varKey = placeholder.replace(/\{|\}/g, '');
            const mapping = variableMappings[varKey];
            let text = `[variável ${varKey} não mapeada]`;

            if (mapping) {
                if (mapping.type === 'fixed') text = mapping.value;
                else if (mapping.type === 'dynamic') {
                    const dynamicValue = contact[mapping.value as keyof typeof contact];
                    if (dynamicValue !== null && dynamicValue !== undefined) text = String(dynamicValue);
                    else text = `[dado ausente]`;
                }
            }
            return { type: 'text', text };
        });

        const components: any[] = [];
        if (template.headerType && template.headerType !== 'NONE' && template.headerType !== 'TEXT') {
            if (!mediaAssetId) throw new Error("Este modelo requer um anexo de mídia.");
            const { handle, asset } = await getMediaData(mediaAssetId, connection.id, connection.wabaId);
            const headerType = template.headerType.toLowerCase() as 'image' | 'video' | 'document';
            
            const mediaObject: { id: string; filename?: string } = { id: handle };
            if (headerType === 'document' && asset.name) {
                mediaObject.filename = asset.name;
            }

            components.push({
                type: 'header',
                parameters: [{ type: headerType, [headerType]: mediaObject }]
            });
        }
        
        if (bodyParams.length > 0) {
            components.push({ type: 'body', parameters: bodyParams });
        }
        
        // 3. Send the message via Meta API
        const response = await sendWhatsappTemplateMessage({
            connectionId: connection.id,
            to: contact.phone,
            templateName: template.name,
            languageCode: template.language,
            components,
        });

        const sentMessageId = (response as unknown as MetaApiMessageResponse).messages?.[0]?.id;
        
        // 4. Find or Create Conversation and save message
        const [conversation] = await db.transaction(async (tx) => {
            let [existingConversation] = await tx
              .select()
              .from(conversations)
              .where(and(eq(conversations.contactId, contact.id), eq(conversations.connectionId, connection.id)));
              
            if (existingConversation) {
                const [updatedConvo] = await tx.update(conversations).set({
                    lastMessageAt: new Date(),
                    status: 'IN_PROGRESS',
                    archivedAt: null,
                    archivedBy: null,
                }).where(eq(conversations.id, existingConversation.id)).returning();
                existingConversation = updatedConvo;
            } else {
                 [existingConversation] = await tx.insert(conversations).values({
                    companyId: companyId,
                    contactId: contact.id,
                    connectionId: connection.id,
                    status: 'IN_PROGRESS' // Starts as in progress since we sent the first message
                }).returning();
            }

            if (!existingConversation) {
                throw new Error("Falha ao criar ou atualizar a conversa na transação.");
            }

            await tx.insert(messages).values({
                conversationId: existingConversation.id,
                providerMessageId: sentMessageId,
                senderType: 'AGENT', // Or 'SYSTEM' if automated
                content: `Template: ${template.name}`,
                contentType: 'TEXT',
                status: 'SENT',
                sentAt: new Date(),
            });

            return [existingConversation];
        });

        if (!conversation) {
            throw new Error("Falha ao obter a conversa após a transação.");
        }

        return NextResponse.json({ success: true, conversationId: conversation.id });

    } catch (error) {
        console.error("Erro ao iniciar conversa:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
