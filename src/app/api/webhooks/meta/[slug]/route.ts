

// src/app/api/webhooks/meta/[slug]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { companies, connections, whatsappDeliveryReports, contacts, conversations, messages, campaigns, metaWebhookHealthEvents } from '@/lib/db/schema';
import { eq, and, inArray, sql, isNull, desc } from 'drizzle-orm';
import { getPhoneVariations, canonicalizeBrazilPhone, sanitizePhone } from '@/lib/utils';
import crypto from 'crypto';
import { decrypt } from '@/lib/crypto';
import { getMediaUrl } from '@/lib/facebookApiService';
import { uploadFileToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import { processIncomingMessageTrigger } from '@/lib/automation-engine';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';
import { UserNotificationsService } from '@/lib/notifications/user-notifications.service';

async function recordWebhookHealth(connectionId: string, status: 'success' | 'failure', errorMessage?: string) {
    try {
        await db.insert(metaWebhookHealthEvents).values({
            connectionId,
            status,
            errorMessage: errorMessage || null,
            validatedAt: new Date(),
        });
        
        const allEvents = await db.select({ id: metaWebhookHealthEvents.id })
            .from(metaWebhookHealthEvents)
            .where(eq(metaWebhookHealthEvents.connectionId, connectionId))
            .orderBy(desc(metaWebhookHealthEvents.validatedAt))
            .limit(300);
        
        if (allEvents.length > 200) {
            const idsToKeep = allEvents.slice(0, 200).map(e => e.id);
            await db.delete(metaWebhookHealthEvents)
                .where(and(
                    eq(metaWebhookHealthEvents.connectionId, connectionId),
                    sql`${metaWebhookHealthEvents.id} NOT IN (${sql.join(idsToKeep.map(id => sql`${id}`), sql`, `)})`
                ));
        }
    } catch (err) {
        console.error('[Meta Webhook] Failed to record health event:', err);
    }
}

// GET /api/webhooks/meta/[slug] - Used for Facebook Webhook Verification

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');

    console.log(`[Webhook Verification] Tentativa de verificação para slug: ${params.slug}`);
    console.log(`[Webhook Verification] Mode: ${mode}`);
    console.log(`[Webhook Verification] Verify Token recebido: ${verifyToken}`);
    console.log(`[Webhook Verification] Verify Token esperado: ${process.env.META_VERIFY_TOKEN}`);
    console.log(`[Webhook Verification] Challenge: ${challenge}`);

    if (mode === 'subscribe' && verifyToken === process.env.META_VERIFY_TOKEN) {
        console.log(`✅ Webhook verificado com sucesso para o slug: ${params.slug}`);
        return new NextResponse(challenge, { status: 200 });
    } else {
        console.error(`❌ Falha na verificação do Webhook para slug: ${params.slug}`);
        console.error(`   Motivo: mode=${mode}, tokenMatch=${verifyToken === process.env.META_VERIFY_TOKEN}`);
        return new NextResponse('Forbidden', { status: 403 });
    }
}


// POST /api/webhooks/meta/[slug] - Receives events from Meta
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
    const { slug } = params;
    const timestamp = new Date().toISOString();
    
    console.log(`🔔 [Meta Webhook] ${timestamp} - POST recebido para slug: ${slug}`);
    
    try {
        const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.webhookSlug, slug)).limit(1);
        if (!company) {
            console.warn(`❌ [Meta Webhook] Slug não encontrado: ${slug}`);
            return new NextResponse('Company slug not found', { status: 404 });
        }
        
        console.log(`✅ [Meta Webhook] Company encontrada: ${company.id}`);
        
        const [connection] = await db.select()
            .from(connections)
            .where(and(
                eq(connections.companyId, company.id), 
                eq(connections.connectionType, 'meta_api'),
                eq(connections.isActive, true)
            ))
            .limit(1);

        if (!connection) {
            console.error(`❌ [Meta Webhook] Nenhuma conexão Meta API ativa encontrada para company ${company.id}`);
            return new NextResponse('No active Meta API connection found', { status: 400 });
        }

        console.log(`✅ [Meta Webhook] Conexão ativa: ${connection.config_name} (Phone ID: ${connection.phoneNumberId})`);

        const decryptedAppSecret = (connection && connection.appSecret) ? decrypt(connection.appSecret) : null;

        if (!decryptedAppSecret) {
            console.error(`❌ [Meta Webhook] Falha ao descriptografar App Secret para ${connection.config_name}`);
            return new NextResponse('App Secret for active Meta connection not configured or decryption failed', { status: 400 });
        }

        // Debug: Log masked appSecret for troubleshooting
        const maskedSecret = decryptedAppSecret.substring(0, 4) + '...' + decryptedAppSecret.substring(decryptedAppSecret.length - 4);
        console.log(`🔍 [Meta Webhook] App Secret (masked): ${maskedSecret}, Length: ${decryptedAppSecret.length}`);

        const signature = request.headers.get('x-hub-signature-256');
        if (!signature) {
             console.warn(`❌ [Meta Webhook] Webhook sem assinatura HMAC`);
             return new NextResponse('Signature missing', { status: 400 });
        }
        
        console.log(`🔍 [Meta Webhook] Signature recebida: ${signature.substring(0, 20)}...`);
        
        const rawBody = await request.text();
        console.log(`🔍 [Meta Webhook] Raw body length: ${rawBody.length} bytes`);
        
        const hmac = crypto.createHmac('sha256', decryptedAppSecret);
        hmac.update(rawBody);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;
        
        console.log(`🔍 [Meta Webhook] Expected signature: ${expectedSignature.substring(0, 20)}...`);
        
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            console.error(`❌ [Meta Webhook] Assinatura HMAC inválida`);
            console.error(`   Recebida: ${signature.substring(0, 20)}...`);
            console.error(`   Esperada: ${expectedSignature.substring(0, 20)}...`);
            console.error(`   Connection: ${connection.config_name}`);
            console.error(`   DEBUG: App Secret Length: ${decryptedAppSecret.length}, Body Length: ${rawBody.length}`);
            
            recordWebhookHealth(connection.id, 'failure', 'HMAC signature mismatch').catch(() => {});
            return new NextResponse('Invalid signature', { status: 403 });
        }
        
        console.log(`✅ [Meta Webhook] Assinatura HMAC validada`);
        
        recordWebhookHealth(connection.id, 'success').catch(() => {});
        
        const payload = JSON.parse(rawBody);
        
        console.log(`📦 [Meta Webhook] Payload recebido:`, JSON.stringify(payload, null, 2));
        
        // Don't await this, respond to Meta immediately
        processWebhookEvents(payload, company.id).catch(err => {
            console.error(`❌ [Meta Webhook] Erro no processamento em background:`, err);
        });
        
        console.log(`✅ [Meta Webhook] ${timestamp} - Webhook processado com sucesso`);
        return new NextResponse('OK', { status: 200 });

    } catch (error) {
        console.error(`❌ [Meta Webhook] Erro crítico:`, error);
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
    const { id: wamid, status, errors, timestamp, recipient_id } = statusObject;
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
        
        // Tenta atualizar mensagem pelo providerMessageId
        const updatedMessages = await db.update(messages)
            .set(dataToUpdate)
            .where(
                and(
                    eq(messages.providerMessageId, wamid),
                    inArray(messages.conversationId, db.select({ id: subquery.id }).from(subquery))
                )
            )
            .returning({ id: messages.id });

        // Tenta atualizar delivery reports pelo providerMessageId
        const updatedDeliveryReports = await db.update(whatsappDeliveryReports)
            .set({ ...dataToUpdate, updatedAt: eventDate })
            .where(
                and(
                    eq(whatsappDeliveryReports.providerMessageId, wamid),
                    inArray(whatsappDeliveryReports.campaignId, db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.companyId, companyId)))
                )
            )
            .returning({ id: whatsappDeliveryReports.id });
        
        // FALLBACK: Se não atualizou por wamid, busca delivery reports/mensagens órfãs com providerMessageId NULL
        // e faz backfill (caso Meta não tenha retornado wamid no envio inicial)
        if (updatedMessages.length === 0 && updatedDeliveryReports.length === 0) {
            // Busca delivery reports órfãos (sem providerMessageId) recentes (últimas 24h)
            const orphanedReports = await db
                .select()
                .from(whatsappDeliveryReports)
                .innerJoin(campaigns, eq(whatsappDeliveryReports.campaignId, campaigns.id))
                .innerJoin(contacts, eq(whatsappDeliveryReports.contactId, contacts.id))
                .where(
                    and(
                        eq(campaigns.companyId, companyId),
                        isNull(whatsappDeliveryReports.providerMessageId),
                        eq(whatsappDeliveryReports.status, 'sent'),
                        sql`${whatsappDeliveryReports.sentAt} > NOW() - INTERVAL '24 hours'`
                    )
                )
                .limit(10); // Limita para evitar busca excessiva
            
            // Tenta fazer match por recipient_id ou timestamp próximo
            // (Meta envia recipient_id que corresponde ao phone number)
            for (const orphanRow of orphanedReports) {
                const report = orphanRow.whatsapp_delivery_reports;
                const contact = orphanRow.contacts;
                
                // Se recipient_id bate com o phone do contato (sem formatação)
                const contactPhonePlain = contact.phone.replace(/\D/g, '');
                if (recipient_id && contactPhonePlain.endsWith(recipient_id.replace(/\D/g, ''))) {
                    // BACKFILL delivery report
                    await db.update(whatsappDeliveryReports)
                        .set({ ...dataToUpdate, providerMessageId: wamid, updatedAt: eventDate })
                        .where(eq(whatsappDeliveryReports.id, report.id));
                    
                    // BACKFILL mensagem correspondente
                    const messagesToBackfill = await db
                        .select()
                        .from(messages)
                        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
                        .where(
                            and(
                                eq(conversations.contactId, report.contactId),
                                eq(conversations.companyId, companyId),
                                isNull(messages.providerMessageId)
                                // metadata field check removed - not available in messages table
                            )
                        )
                        .limit(1);
                    
                    if (messagesToBackfill && messagesToBackfill.length > 0) {
                        const backfillRow = messagesToBackfill[0];
                        if (backfillRow && 'messages' in backfillRow && backfillRow.messages) {
                            await db.update(messages)
                                .set({ ...dataToUpdate, providerMessageId: wamid })
                                .where(eq(messages.id, backfillRow.messages.id));
                        }
                    }
                    
                    console.log(`[Webhook] Backfilled providerMessageId ${wamid} para delivery report ${report.id} e mensagem associada (recipient: ${recipient_id})`);
                    break; // Só faz backfill do primeiro match
                }
            }
        }
        
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
    const phone = sanitizePhone(contactData.wa_id);
    const messagePreview = getMessageContent(messageData).substring(0, 50);
    
    console.log(`📨 [Meta Webhook] Nova mensagem de ${contactData.profile.name} (${phone}): "${messagePreview}"`);
    
    const { conversationId, newMessageId, isNewConversation, contactId, contactName, contactPhone } = await db.transaction(async (tx) => {
        const [connection] = await tx.select().from(connections).where(and(eq(connections.phoneNumberId, metadata.phone_number_id), eq(connections.companyId, companyId)));
        if (!connection) {
            console.error(`❌ [Meta Webhook] Conexão não encontrada para Phone Number ID: ${metadata.phone_number_id}`);
            throw new Error('Connection not found');
        }

        console.log(`✅ [Meta Webhook] Conexão encontrada: ${connection.config_name}`);

        const initialPhone = sanitizePhone(contactData.wa_id);
        if (!initialPhone) throw new Error('Invalid phone number');

        const phoneVariations = getPhoneVariations(initialPhone);
        let [contact] = await tx.select().from(contacts).where(and(eq(contacts.companyId, companyId), inArray(contacts.phone, phoneVariations)));

        if (!contact) {
            console.log(`➕ [Meta Webhook] Criando novo contato: ${contactData.profile.name} (${canonicalizeBrazilPhone(initialPhone)})`);
            [contact] = await tx.insert(contacts).values({ companyId: companyId, name: contactData.profile.name || canonicalizeBrazilPhone(initialPhone), phone: canonicalizeBrazilPhone(initialPhone) }).returning();
        } else {
             console.log(`✅ [Meta Webhook] Contato existente encontrado: ${contact.name} (ID: ${contact.id})`);
             const [updatedContact] = await tx.update(contacts).set({ whatsappName: contactData.profile.name, profileLastSyncedAt: new Date() }).where(eq(contacts.id, contact.id)).returning();
             if (updatedContact) contact = updatedContact;
        }

        if (!contact) throw new Error("Falha ao criar ou encontrar o contato.");
            
        let [conversation] = await tx.select().from(conversations).where(and(eq(conversations.contactId, contact.id), eq(conversations.connectionId, connection.id)));
        let isNewConversation = false;
        if (!conversation) {
            console.log(`➕ [Meta Webhook] Criando nova conversa para ${contact.name}`);
            [conversation] = await tx.insert(conversations).values({ companyId, contactId: contact.id, connectionId: connection.id }).returning();
            isNewConversation = true;
        } else {
            console.log(`✅ [Meta Webhook] Conversa existente atualizada (ID: ${conversation.id})`);
            [conversation] = await tx.update(conversations).set({ lastMessageAt: new Date(), status: 'IN_PROGRESS', archivedAt: null, archivedBy: null }).where(eq(conversations.id, conversation.id)).returning();
        }

        if (!conversation) throw new Error("Falha ao criar ou encontrar a conversa.");
        
        let permanentMediaUrl = null;
        if (['image', 'video', 'document', 'audio'].includes(messageData.type)) {
            const mediaId = messageData[messageData.type].id;
            if (!connection.accessToken) {
                console.warn(`⚠️ [Meta Webhook] Access token ausente para conexão ${connection.config_name}. Mídia não será processada.`);
            }
            const accessToken = connection.accessToken ? decrypt(connection.accessToken) : null;
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
                        console.log(`📎 [Meta Webhook] Mídia salva: ${s3Key} (URL permanente criada)`);
                    } catch (s3Error) {
                        console.error(`❌ [Meta Webhook] Falha ao salvar mídia no S3:`, s3Error);
                        console.warn(`⚠️ [Meta Webhook] Mídia será salva com mediaUrl=null (URLs temporárias do WhatsApp não são persistidas)`);
                    }
                }
            }
        }
        
        if (permanentMediaUrl && permanentMediaUrl.includes('mmg.whatsapp.net')) {
            console.error(`🚨 [Meta Webhook] ERRO CRÍTICO: Tentativa de salvar URL temporária do WhatsApp detectada! URL rejeitada.`);
            permanentMediaUrl = null;
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
        
        console.log(`✅ [Meta Webhook] Mensagem salva no banco (ID: ${newMessage.id}) na conversa ${conversation.id}`);

        try {
            console.log(`[Webhook] Dispatching message_received for message ${newMessage.id}`);
            await webhookDispatcher.dispatch(companyId, 'message_received', {
                messageId: newMessage.id,
                conversationId: conversation.id,
                content: getMessageContent(messageData),
                senderPhone: contact.phone,
            });
        } catch (webhookError) {
            console.error('[Webhook] Error dispatching message_received:', webhookError);
        }
            
        return { 
            conversationId: conversation.id, 
            newMessageId: newMessage.id,
            isNewConversation,
            contactId: contact.id,
            contactName: contact.name || contact.phone,
            contactPhone: contact.phone
        };
    });

    // Notificar usuários sobre novo atendimento (APÓS transação commitada)
    if (isNewConversation && conversationId) {
        try {
            await UserNotificationsService.notifyNewConversation(
                companyId,
                conversationId,
                contactName
            );
            console.log(`[UserNotifications] New conversation notification sent for ${conversationId}`);
        } catch (notifError) {
            console.error('[UserNotifications] Error sending new conversation notification:', notifError);
        }
        
        try {
            console.log(`[Webhook] Dispatching conversation_created for conversation ${conversationId}`);
            await webhookDispatcher.dispatch(companyId, 'conversation_created', {
                conversationId: conversationId,
                contactId: contactId,
                contactPhone: contactPhone,
                contactName: contactName,
            });
        } catch (webhookError) {
            console.error('[Webhook] Error dispatching conversation_created:', webhookError);
        }
    }

    if (conversationId && newMessageId) {
      console.log(`🤖 [Meta Webhook] Disparando automações para conversa ${conversationId}`);
      await processIncomingMessageTrigger(conversationId, newMessageId);
    }
    
    console.log(`✅ [Meta Webhook] Processamento completo para ${contactData.profile.name}`);
}
