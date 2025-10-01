import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
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

    // Verify connection exists
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
      console.warn(`Security violation: User from company ${userCompanyId} tried to disconnect connection from company ${connection.companyId}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this connection' },
        { status: 403 }
      );
    }

    // Disconnect WhatsApp session
    const whatsappService = WhatsAppQRService.getInstance();
    await whatsappService.disconnectSession(connectionId);

    // Update connection status
    await db.update(connections)
      .set({
        isActive: false,
      })
      .where(eq(connections.id, connectionId));

    return NextResponse.json({
      success: true,
      message: 'WhatsApp QR session disconnected successfully',
      connectionId,
    });
  } catch (error) {
    console.error('Error disconnecting WhatsApp QR:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect session' },
      { status: 500 }
    );
  }
}