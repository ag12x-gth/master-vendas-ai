import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connections, conversations, contacts, messages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import WhatsAppQRService from '@/lib/services/whatsapp-qr.service';
import { getUserSession } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verificar autenticação do usuário
    const sessionData = await getUserSession();
    if (!sessionData.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      );
    }
    
    const userCompanyId = sessionData.user.companyId;
    const { connectionId, phoneNumber, message, conversationId } = await request.json();

    if (!connectionId || !phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Connection ID, phone number, and message are required' },
        { status: 400 }
      );
    }

    // Verify connection exists and is QR type
    const [connection] = await db.select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // SECURITY CHECK: Verificar se a conexão pertence à empresa do usuário
    if (connection.companyId !== userCompanyId) {
      console.warn(`Security violation: User from company ${userCompanyId} tried to send message using connection from company ${connection.companyId}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this connection' },
        { status: 403 }
      );
    }

    if (connection.connectionType !== 'whatsapp_qr') {
      return NextResponse.json(
        { error: 'Connection is not configured for QR code' },
        { status: 400 }
      );
    }

    // Format phone number (ensure it has country code)
    const formattedPhone = phoneNumber.replace(/\D/g, '');

    // Send message via WhatsApp service
    const whatsappService = WhatsAppQRService.getInstance();
    const result = await whatsappService.sendMessage(connectionId, formattedPhone, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Save message to database if conversationId provided
    if (conversationId) {
      await db.insert(messages)
        .values({
          conversationId,
          senderType: 'agent',
          content: message,
          status: 'sent',
          providerMessageId: result.messageId,
        });
    } else {
      // Find or create conversation and save message
      let [contact] = await db.select()
        .from(contacts)
        .where(and(
          eq(contacts.phone, formattedPhone),
          eq(contacts.companyId, connection.companyId)
        ))
        .limit(1);

      if (!contact) {
        // Create contact if doesn't exist
        [contact] = await db.insert(contacts)
          .values({
            companyId: connection.companyId,
            name: formattedPhone,
            phone: formattedPhone,
          })
          .returning();
      }

      let [conversation] = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.contactId, contact!.id),
          eq(conversations.connectionId, connectionId)
        ))
        .limit(1);

      if (!conversation) {
        // Create conversation if doesn't exist
        [conversation] = await db.insert(conversations)
          .values({
            companyId: connection.companyId,
            contactId: contact!.id,
            connectionId,
            status: 'active',
          })
          .returning();
      }

      if (!conversation) {
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        );
      }

      // Save message
      await db.insert(messages)
        .values({
          conversationId: conversation.id,
          senderType: 'agent',
          content: message,
          status: 'sent',
          providerMessageId: result.messageId,
        });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}