import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations, contacts, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { normalizePhone, isGroupChat } from '@/lib/utils/phone';
import { webhookDispatcher } from '@/services/webhook-dispatcher.service';

interface WhatsmeowWebhook {
  type: string;
  from: string;
  messageId: string;
  timestamp: number;
  data: {
    text?: string;
    chat?: string;
    isGroup?: boolean;
    fromMe?: boolean;
    pushName?: string;
    messageType?: string;
  };
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('X-Webhook-Secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: WhatsmeowWebhook = await request.json();
    
    console.log('📨 whatsmeow webhook received:', {
      type: payload.type,
      from: payload.from,
      messageId: payload.messageId
    });

    // Ignore outgoing messages
    if (payload.data.fromMe) {
      return NextResponse.json({ success: true, action: 'ignored_outgoing' });
    }

    // Ignore group chats
    if (payload.data.isGroup || isGroupChat(payload.from)) {
      console.log('⏭️  Ignoring group chat message');
      return NextResponse.json({ success: true, action: 'ignored_group' });
    }

    // Normalize phone number
    const phoneNumber = normalizePhone(payload.from);
    if (!phoneNumber) {
      console.error('Invalid phone number:', payload.from);
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Validate companyId
    const companyId = process.env.DEFAULT_COMPANY_ID;
    if (!companyId) {
      console.error('DEFAULT_COMPANY_ID not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify company exists
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      console.error('Company not found:', companyId);
      return NextResponse.json({ error: 'Invalid company configuration' }, { status: 500 });
    }

    // Check for duplicate message (idempotency)
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.providerMessageId, payload.messageId))
      .limit(1);

    if (existingMessage) {
      console.log('⏭️  Duplicate message ignored:', payload.messageId);
      return NextResponse.json({ 
        success: true, 
        action: 'duplicate_ignored',
        conversationId: existingMessage.conversationId 
      });
    }
    
    // Get or create contact (scoped by company)
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.phone, phoneNumber),
        eq(contacts.companyId, companyId)
      ))
      .limit(1);

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Detect if this is a group/community using JID-first logic
      const { detectGroup } = await import('@/lib/utils/phone');
      const isGroup = detectGroup({ remoteJid: payload.from, phone: phoneNumber });

      // Create new contact
      const newContacts = await db.insert(contacts).values({
        companyId: companyId,
        name: payload.data.pushName || phoneNumber,
        phone: phoneNumber,
        isGroup,
        externalProvider: 'whatsmeow'
      }).returning();
      
      if (!newContacts[0]) {
        throw new Error('Failed to create contact');
      }
      
      contactId = newContacts[0].id;
    }

    // Get or create conversation
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, contactId))
      .limit(1);

    let conversationId: string;
    let _isNewConversation = false;

    if (existingConversation) {
      conversationId = existingConversation.id;
      
      // Update last message time
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(payload.timestamp * 1000),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));
    } else {
      // Create new conversation
      const newConversations = await db.insert(conversations).values({
        companyId: companyId,
        contactId: contactId,
        status: 'NEW',
        lastMessageAt: new Date(payload.timestamp * 1000)
      }).returning();
      
      if (!newConversations[0]) {
        throw new Error('Failed to create conversation');
      }
      
      conversationId = newConversations[0].id;
      _isNewConversation = true;

      try {
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
        console.log(`[Webhook] Dispatching conversation_created for conversation ${conversationId}`);
        await webhookDispatcher.dispatch(companyId, 'conversation_created', {
          conversationId: conversationId,
          contactId: contactId,
          contactPhone: contact?.phone,
          contactName: contact?.name,
        });
      } catch (webhookError) {
        console.error('[Webhook] Error dispatching conversation_created:', webhookError);
      }
    }

    // Save message to database
    const [savedMessage] = await db.insert(messages).values({
      conversationId: conversationId,
      providerMessageId: payload.messageId,
      senderType: 'CONTACT',
      content: payload.data.text || '',
      contentType: 'TEXT',
      sentAt: new Date(payload.timestamp * 1000)
    }).returning();

    if (!savedMessage) {
      console.error('Failed to save message');
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    console.log('✅ Message saved for conversation:', conversationId);

    try {
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      console.log(`[Webhook] Dispatching message_received for message ${savedMessage.id}`);
      await webhookDispatcher.dispatch(companyId, 'message_received', {
        messageId: savedMessage.id,
        conversationId: conversationId,
        content: payload.data.text || '',
        senderPhone: contact?.phone,
      });
    } catch (webhookError) {
      console.error('[Webhook] Error dispatching message_received:', webhookError);
    }

    // Process with AI and send text response
    const messageText = payload.data.text || '';
    const response = await generateAIResponse(messageText);
    if (response) {
      await sendWhatsmeowMessage(phoneNumber, response);
    }

    return NextResponse.json({ 
      success: true, 
      conversationId
    });

  } catch (error) {
    console.error('Error processing whatsmeow webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIResponse(text: string): Promise<string | null> {
  // Simple keyword detection for now
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('olá') || lowerText.includes('oi')) {
    return 'Olá! 👋 Sou o assistente da Master IA. Como posso ajudar você hoje?';
  }
  
  if (lowerText.includes('ajuda') || lowerText.includes('help')) {
    return 'Estou aqui para ajudar! Você pode me perguntar sobre nossos serviços ou dizer "falar" se precisar de atendimento por voz.';
  }
  
  if (lowerText.includes('falar') || lowerText.includes('ligar') || lowerText.includes('telefone')) {
    return '📞 Entendi que você gostaria de falar por telefone. Vou preparar uma ligação para você em breve!';
  }
  
  return 'Recebi sua mensagem! Como posso ajudar?';
}

// Voice escalation feature removed (VAPI deprecated)
// async function shouldEscalateToVoice(text: string): Promise<boolean> {
//   const lowerText = text.toLowerCase();
//   const voiceKeywords = ['falar', 'ligar', 'telefone', 'chamada', 'voz', 'call', 'atendente'];
//   return voiceKeywords.some(keyword => lowerText.includes(keyword));
// }

async function sendWhatsmeowMessage(to: string, message: string): Promise<void> {
  try {
    const whatsmeowUrl = process.env.WHATSMEOW_SERVICE_URL || 'http://localhost:8001';
    const password = process.env.WHATSMEOW_PASSWORD;
    
    if (!password) {
      throw new Error('WHATSMEOW_PASSWORD not configured');
    }

    const basicAuth = Buffer.from(`admin:${password}`).toString('base64');
    const normalizedPhone = normalizePhone(to);

    if (!normalizedPhone) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    const response = await fetch(`${whatsmeowUrl}/send/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        phone: normalizedPhone.substring(1), // Remove + for whatsmeow
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`whatsmeow API error: ${response.status}`);
    }

    console.log('✅ Response sent via whatsmeow');
  } catch (error) {
    console.error('Error sending whatsmeow message:', error);
    throw error;
  }
}
