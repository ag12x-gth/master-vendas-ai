import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations, contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Only process incoming messages (not from us)
    if (payload.data.fromMe) {
      return NextResponse.json({ success: true, action: 'ignored_outgoing' });
    }

    const phoneNumber = payload.from;
    const companyId = process.env.DEFAULT_COMPANY_ID || 'default';
    
    // Get or create contact
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, phoneNumber))
      .limit(1);

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create new contact
      const [newContact] = await db.insert(contacts).values({
        companyId: companyId,
        name: payload.data.pushName || phoneNumber,
        phone: phoneNumber,
        source: 'whatsmeow'
      }).returning();
      
      contactId = newContact.id;
    }

    // Get or create conversation
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.contactId, contactId))
      .limit(1);

    let conversationId: string;

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
      const [newConversation] = await db.insert(conversations).values({
        companyId: companyId,
        contactId: contactId,
        status: 'NEW',
        lastMessageAt: new Date(payload.timestamp * 1000)
      }).returning();
      
      conversationId = newConversation.id;
    }

    // Save message to database
    await db.insert(messages).values({
      conversationId: conversationId,
      providerMessageId: payload.messageId,
      senderType: 'CONTACT',
      content: payload.data.text || '',
      contentType: 'TEXT',
      sentAt: new Date(payload.timestamp * 1000)
    });

    console.log('✅ Message saved for conversation:', conversationId);

    // TODO: Process with AI and generate response
    // For now, send a simple auto-reply
    const response = await generateAIResponse(payload.data.text || '');
    
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

async function sendWhatsmeowMessage(to: string, message: string): Promise<void> {
  try {
    const whatsmeowUrl = process.env.WHATSMEOW_SERVICE_URL || 'http://localhost:8001';
    const basicAuth = Buffer.from(
      `admin:${process.env.WHATSMEOW_PASSWORD || 'masterIA2024'}`
    ).toString('base64');

    const response = await fetch(`${whatsmeowUrl}/send/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify({
        phone: to,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`whatsmeow API error: ${response.status}`);
    }

    console.log('✅ Response sent via whatsmeow');
  } catch (error) {
    console.error('Error sending whatsmeow message:', error);
  }
}
