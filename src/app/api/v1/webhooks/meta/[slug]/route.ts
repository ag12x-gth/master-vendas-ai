
// src/app/api/webhooks/meta/[slug]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { companies, webhookLogs, connections, whatsappDeliveryReports, contacts, conversations, messages, campaigns } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getPhoneVariations, canonicalizeBrazilPhone, sanitizePhone } from '@/lib/utils';
import crypto from 'crypto';
import { decrypt } from '@/lib/crypto';
import { getMediaUrl } from '@/lib/facebookApiService';
import { uploadFileToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

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

        await db.insert(webhookLogs).values({
            companyId: company.id,
            payload: payload,
        });

        processWebhookEvents(payload, company.id);
        
        return new NextResponse('OK', { status: 200 });

    } catch (error) {
        console.error('Erro ao processar o webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        return NextResponse.json({ error: 'Erro interno do servidor.', details: errorMessage }, { status: 500 });
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
            console.log(`[Webhook] Status da mensagem de chat ${wamid} atualizado para ${status} para a empresa ${companyId}`);
            return;
        }

        const updatedReports = await db.update(whatsappDeliveryReports)
            .set({ ...dataToUpdate, updatedAt: eventDate })
            .where(
                and(
                    eq(whatsappDeliveryReports.providerMessageId, wamid),
                    inArray(whatsappDeliveryReports.campaignId, db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.companyId, companyId)))
                )
            )
            .returning({ id: whatsappDeliveryReports.id });
        
        if (updatedReports.length > 0) {
            console.log(`[Webhook] Status da mensagem de campanha ${wamid} atualizado para ${status} para a empresa ${companyId}`);
            return;
        }
        
    } catch (error) {
        console.error(`Erro ao atualizar status para a mensagem ${wamid} da empresa ${companyId}:`, error);
    }
}

function getMessageContent(messageData: any): string {
    // Tipos de texto e respostas
    if (messageData.type === 'text') return messageData.text?.body;
    if (messageData.type === 'button') return messageData.button?.text;
    if (messageData.type === 'interactive' && messageData.interactive?.button_reply) return messageData.interactive.button_reply.title;
    if (messageData.type === 'interactive' && messageData.interactive?.list_reply) return messageData.interactive.list_reply.title;
    
    // Mídia com legendas
    if (messageData.image?.caption) return messageData.image.caption;
    if (messageData.video?.caption) return messageData.video.caption;
    if (messageData.document?.caption) return messageData.document.caption;
    if (messageData.document?.filename) return `📄 ${messageData.document.filename}`;
    
    // Mídia sem legendas
    if (messageData.type === 'image') return '📷 Imagem';
    if (messageData.type === 'video') return '📹 Vídeo';
    if (messageData.type === 'audio') return '🎵 Áudio';
    if (messageData.type === 'sticker') return 'Sticker';
    
    // Tipos especiais
    if (messageData.type === 'location') {
        const { latitude, longitude, name, address } = messageData.location;
        const link = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        let locationDetails = `📍 Localização partilhada: ${link}`;
        if (name) locationDetails += `
Nome: ${name}`;
        if (address) locationDetails += `
Endereço: ${address}`;
        return locationDetails;
    }
    if (messageData.type === 'contacts' && messageData.contacts.length > 0) {
        const contactInfo = messageData.contacts[0];
        const name = contactInfo.name.formatted_name;
        const phone = contactInfo.phones[0]?.phone;
        return `👤 Contacto partilhado: ${name} (${phone})`;
    }

    return messageData.type.toUpperCase() || 'MENSAGEM NÃO TEXTUAL';
}


async function processIncomingMessage(
    { messageData, contactData, metadata, companyId }:
    { messageData: any, contactData: any, metadata: any, companyId: string }
) {
    await db.transaction(async (tx) => {
        try {
            const [connection] = await tx.select()
                .from(connections)
                .where(and(
                    eq(connections.phoneNumberId, metadata.phone_number_id),
                    eq(connections.companyId, companyId)
                ));

            if (!connection) {
                console.error(`Webhook: Conexão não encontrada para a empresa ${companyId} (PhoneNumberID: ${metadata.phone_number_id})`);
                return;
            }

            const initialPhone = sanitizePhone(contactData.wa_id);
            if (!initialPhone) {
                console.error(`Webhook: Número de telefone inválido: ${contactData.wa_id}`);
                return;
            }

            const phoneVariations = getPhoneVariations(initialPhone);
            
            let [contact] = await tx.select()
                .from(contacts)
                .where(and(
                    eq(contacts.companyId, companyId), 
                    inArray(contacts.phone, phoneVariations)
                ))
                .limit(1);

            if (contact) {
                const updates: Partial<typeof contacts.$inferInsert> = {
                    whatsappName: contactData.profile.name,
                    profileLastSyncedAt: new Date(),
                };
                
                const [updatedContact] = await tx.update(contacts)
                    .set(updates)
                    .where(eq(contacts.id, contact.id))
                    .returning();
                if (updatedContact) contact = updatedContact;

            } else {
                const canonicalPhoneForNewContact = canonicalizeBrazilPhone(initialPhone);

                const [newContact] = await tx.insert(contacts).values({
                    companyId: companyId,
                    name: contactData.profile.name || canonicalPhoneForNewContact,
                    phone: canonicalPhoneForNewContact,
                    whatsappName: contactData.profile.name,
                    profileLastSyncedAt: new Date(),
                }).returning();
                if (newContact) contact = newContact;
            }

            if (!contact) {
                throw new Error("Falha ao criar ou encontrar o contato.");
            }
            
            let [conversation] = await tx.select().from(conversations).where(
                and(
                    eq(conversations.contactId, contact.id),
                    eq(conversations.connectionId, connection.id)
                )
            );

            if (!conversation) {
                const [newConversation] = await tx.insert(conversations).values({
                    companyId: companyId,
                    contactId: contact.id,
                    connectionId: connection.id,
                }).returning();
                if (newConversation) conversation = newConversation;
            } else {
                const [updatedConversation] = await tx.update(conversations)
                    .set({ lastMessageAt: new Date(), status: 'IN_PROGRESS' })
                    .where(eq(conversations.id, conversation.id))
                    .returning();
                if (updatedConversation) conversation = updatedConversation;
            }

            if (!conversation) {
                throw new Error("Falha ao criar ou encontrar a conversa.");
            }
            
            let permanentMediaUrl = null;
            const mediaTypes = ['image', 'video', 'document', 'audio'];
            const messageType = messageData.type;

            if (mediaTypes.includes(messageType)) {
                const mediaId = messageData[messageType].id;
                const accessToken = decrypt(connection.accessToken);
                if (mediaId && accessToken) {
                    const tempMediaUrl = await getMediaUrl(mediaId, accessToken);
                    if (tempMediaUrl) {
                        try {
                            const mediaResponse = await fetch(tempMediaUrl, {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            if (!mediaResponse.ok) throw new Error(`Falha ao descarregar a mídia da Meta. Status: ${mediaResponse.status}`);
                            
                            const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
                            const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream';
                            const extension = contentType.split('/')[1] || 'bin';
                            const s3Key = `zapmaster/${companyId}/media_recebida/${uuidv4()}.${extension}`;

                            permanentMediaUrl = await uploadFileToS3(s3Key, mediaBuffer, contentType);
                            console.log(`[Webhook] Mídia recebida e salva no S3: ${permanentMediaUrl}`);

                        } catch (s3Error) {
                            console.error(`[Webhook] Falha ao processar e salvar mídia no S3:`, s3Error);
                            // Continua o processo mesmo com falha no S3 para não perder a mensagem de texto
                        }
                    }
                }
            }
            
            let repliedToInternalId: string | null = null;
            if (messageData.context?.id) {
                const [originalMessage] = await tx.select({id: messages.id})
                    .from(messages)
                    .where(eq(messages.providerMessageId, messageData.context.id));
                if (originalMessage) {
                    repliedToInternalId = originalMessage.id;
                }
            }


            await tx.insert(messages).values({
                conversationId: conversation.id,
                providerMessageId: messageData.id,
                repliedToMessageId: repliedToInternalId,
                senderType: 'USER',
                senderId: contact.id,
                content: getMessageContent(messageData),
                contentType: messageData.type.toUpperCase(),
                mediaUrl: permanentMediaUrl,
            });

        } catch (error) {
             console.error(`Erro na transação do webhook para a empresa ${companyId}:`, error);
             throw error; 
        }
    });
}
