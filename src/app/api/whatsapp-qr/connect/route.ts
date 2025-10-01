import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connections, whatsappQrSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    // Get connection details
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
      console.warn(`Security violation: User from company ${userCompanyId} tried to access connection from company ${connection.companyId}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this connection' },
        { status: 403 }
      );
    }

    // Check if connection type is whatsapp_qr
    if (connection.connectionType !== 'whatsapp_qr') {
      return NextResponse.json(
        { error: 'Connection is not configured for QR code' },
        { status: 400 }
      );
    }

    // Check if session already exists
    const [existingSession] = await db.select()
      .from(whatsappQrSessions)
      .where(eq(whatsappQrSessions.connectionId, connectionId))
      .limit(1);

    if (!existingSession) {
      // Create new session record
      await db.insert(whatsappQrSessions)
        .values({
          connectionId,
          isActive: false,
        });
    }

    // Initialize WhatsApp connection
    const whatsappService = WhatsAppQRService.getInstance();
    await whatsappService.connectSession(connectionId, connection.companyId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp QR connection initiated. Please scan the QR code.',
      connectionId,
    });
  } catch (error) {
    console.error('Error initiating WhatsApp QR connection:', error);
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}