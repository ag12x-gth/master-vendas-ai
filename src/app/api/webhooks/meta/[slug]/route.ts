

// src/app/api/webhooks/meta/[slug]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { companies, connections, whatsappDeliveryReports, contacts, conversations, messages, campaigns } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getPhoneVariations, canonicalizeBrazilPhone, sanitizePhone } from '@/lib/utils';
import crypto from 'crypto';
import { decrypt } from '@/lib/crypto';
import { getMediaUrl } from '@/lib/facebookApiService';
import { uploadFileToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { processIncomingMessageTrigger } from '@/lib/automation-engine';

// GET /api/webhooks/meta/[slug] - Used for Facebook Webhook Verification
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');

    if (mode === 'subscribe' && verifyToken === process.env.META_VERIFY_TOKEN) {
        console.log(`✅ Webhook verificado com sucesso para o slug: ${params.slug}`);
        return new NextResponse(challenge, { status: 200 });
    } else {
        console.error('Falha na verificação do Webhook. Tokens não correspondem ou modo inválido.');
        return new NextResponse('Forbidden', { status: 403 });
    }
}


// POST /api/webhooks/meta/[slug] - Receives events from Meta
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
    const { slug } = params;
    
    try {
        const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.webhookSlug, slug)).limit(1);
        if (!company) {
            console.warn(`Webhook recebido para slug não encontrado: ${slug}`);
            return new NextResponse('Company slug not found', { status: 404 });
        }
        
        const [connection] = await db.select({ appSecret: connections.appSecret })
            .from(connections)
            .where(and(eq(connections.companyId, company.id), eq(connections.isActive, true)))
            .limit(1);

        const decryptedAppSecret = connection ? decrypt(connection.appSecret) : null;

        if (!decryptedAppSecret) {
            console.error(`App Secret não encontrado ou falhou ao desencriptar para a empresa com slug: ${slug}`);
            return new NextResponse('App Secret for active connection not configured or decryption failed', { status: 400 });
        }

        const signature = request.headers.get('x-hub-signature-256');
        if (!signature) {
             console.warn('Webhook recebido sem assinatura.');
             return new NextResponse('Signature missing', { status: 400 });
        }
        
        const rawBody = await request.text();
        const hmac = crypto.createHmac('sha256', decryptedAppSecret);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            console.warn('Assinatura do webhook inválida.');
            return new NextResponse('Invalid signature', { status: 403 });
        }
        
        const payload = JSON.parse(rawBody);
        
        // Don't await this, respond to Meta immediately
        processWebhookEvents(payload, company.id).catch(err => {
            console.error('[Webhook] Erro não tratado no processamento de eventos em background:', err);
        });
        
        return new NextResponse('OK', { status: 200 });

    } catch (error) {
        console.error('Erro crítico ao processar o webhook:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}


async function processWebhookEvents(payload: any, companyId: string) {
    if (payload.object !== 'whatsapp_business_account') return;

    for (const entry of payload.entry) {
        for (const change of entry.changes) {
            
            if (change.field === 'messages' && change.value.messages) {
                const messageData = change.value.messages?.[0];
                const contactData = change.value.contacts?.[0];
                const metadata = change.value.metadata;

                if (messageData && contactData && metadata) {
                    await processIncomingMessage({
                        messageData,
                        contactData,
                        metadata,
                        companyId
                    });
                }
            }

            if (change.field === 'messages' && change.value.statuses) {
                for (const status of change.value.statuses) {
                    await updateMessageStatus(status, companyId);
                }
            }
        }
    }
}

async function updateMessageStatus(statusObject: any, companyId: string) {
    const { id: wamid, status, errors, timestamp } = statusObject;
    if (!wamid) return;

    try {
        const dataToUpdate: any = { status: status.toLowerCase() };
        const eventDate = new Date(parseInt(timestamp) * 1000);

        if (errors) dataToUpdate.failureReason = JSON.stringify(errors);
        
        if (status === 'read') {
            dataToUpdate.readAt = eventDate;
        }

        const subquery = db
            .select({ id: conversations.id })
            .from(conversations)
            .where(eq(conversations.companyId, companyId))
            .as('company_convos');
        
        const updatedMessages = await db.update(messages)
            .set(dataToUpdate)
            .where(
                and(
                    eq(messages.providerMessageId, wamid),
                    inArray(messages.conversationId, db.select({ id: subquery.id }).from(subquery))
                )
            )
            .returning({ id: messages.id });

        if (updatedMessages.length > 0) {
            return;
        }

        await db.update(whatsappDeliveryReports)
            .set({ ...dataToUpdate, updatedAt: eventDate })
            .where(
                and(
                    eq(whatsappDeliveryReports.providerMessageId, wamid),
                    inArray(whatsappDeliveryReports.campaignId, db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.companyId, companyId)))
                )
            )
            .returning({ id: whatsappDeliveryReports.id });
        
    } catch (error) {
        console.error(`[Webhook] Erro ao atualizar status para a mensagem ${wamid} da empresa ${companyId}:`, error);
    }
}

function getMessageContent(messageData: any): string {
    if (messageData.type === 'text') return messageData.text?.body;
    if (messageData.type === 'button') return messageData.button?.text;
    if (messageData.type === 'interactive' && messageData.interactive?.button_reply) return messageData.interactive.button_reply.title;
    if (messageData.type === 'interactive' && messageData.interactive?.list_reply) return messageData.interactive.list_reply.title;
    if (messageData.image?.caption) return messageData.image.caption;
    if (messageData.video?.caption) return messageData.video.caption;
    if (messageData.document?.caption) return messageData.document.caption;
    if (messageData.document?.filename) return `📄 ${messageData.document.filename}`;
    if (messageData.type === 'image') return '📷 Imagem';
    if (messageData.type === 'video') return '📹 Vídeo';
    if (messageData.type === 'audio') return '🎵 Áudio';
    if (messageData.type === 'sticker') return 'Sticker';
    return messageData.type.toUpperCase() || 'MENSAGEM NÃO TEXTUAL';
}


async function processIncomingMessage(
    { messageData, contactData, metadata, companyId }:
    { messageData: any, contactData: any, metadata: any, companyId: string }
) {
    const { conversationId, newMessageId } = await db.transaction(async (tx) => {
        const [connection] = await tx.select().from(connections).where(and(eq(connections.phoneNumberId, metadata.phone_number_id), eq(connections.companyId, companyId)));
        if (!connection) {
            throw new Error('Connection not found');
        }

        const initialPhone = sanitizePhone(contactData.wa_id);
        if (!initialPhone) throw new Error('Invalid phone number');

        const phoneVariations = getPhoneVariations(initialPhone);
        let [contact] = await tx.select().from(contacts).where(and(eq(contacts.companyId, companyId), inArray(contacts.phone, phoneVariations)));

        if (!contact) {
            [contact] = await tx.insert(contacts).values({ companyId: companyId, name: contactData.profile.name || canonicalizeBrazilPhone(initialPhone), phone: canonicalizeBrazilPhone(initialPhone) }).returning();
        } else {
             const [updatedContact] = await tx.update(contacts).set({ whatsappName: contactData.profile.name, profileLastSyncedAt: new Date() }).where(eq(contacts.id, contact.id)).returning();
             if (updatedContact) contact = updatedContact;
        }

        if (!contact) throw new Error("Falha ao criar ou encontrar o contato.");
            
        let [conversation] = await tx.select().from(conversations).where(and(eq(conversations.contactId, contact.id), eq(conversations.connectionId, connection.id)));
        if (!conversation) {
            [conversation] = await tx.insert(conversations).values({ companyId, contactId: contact.id, connectionId: connection.id }).returning();
        } else {
            [conversation] = await tx.update(conversations).set({ lastMessageAt: new Date(), status: 'IN_PROGRESS', archivedAt: null, archivedBy: null }).where(eq(conversations.id, conversation.id)).returning();
        }

        if (!conversation) throw new Error("Falha ao criar ou encontrar a conversa.");
        
        let permanentMediaUrl = null;
        if (['image', 'video', 'document', 'audio'].includes(messageData.type)) {
            const mediaId = messageData[messageData.type].id;
            const accessToken = decrypt(connection.accessToken);
            if (mediaId && accessToken) {
                const tempMediaUrl = await getMediaUrl(mediaId, accessToken);
                if (tempMediaUrl) {
                    try {
                        const mediaResponse = await fetch(tempMediaUrl, { headers: { 'Authorization': `Bearer ${accessToken}` }});
                        const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
                        const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
                        const extension = contentType.split('/')[1] || 'bin';
                        const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.${extension}`;
                        permanentMediaUrl = await uploadFileToS3(s3Key, mediaBuffer, contentType);
                    } catch (s3Error) {
                        console.error(`[Webhook] Falha ao salvar mídia no S3:`, s3Error);
                    }
                }
            }
        }
        
        const [newMessage] = await tx.insert(messages).values({
            conversationId: conversation.id,
            providerMessageId: messageData.id,
            repliedToMessageId: null,
            senderType: 'USER',
            senderId: contact.id,
            content: getMessageContent(messageData),
            contentType: messageData.type.toUpperCase(),
            mediaUrl: permanentMediaUrl,
        }).returning();

        if (!newMessage) throw new Error('Falha ao salvar a nova mensagem.');
            
        return { conversationId: conversation.id, newMessageId: newMessage.id };
    });

    if (conversationId && newMessageId) {
      await processIncomingMessageTrigger(conversationId, newMessageId);
    }
}
