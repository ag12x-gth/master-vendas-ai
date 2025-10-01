import { NextRequest, NextResponse } from 'next/server';
import WhatsAppQRService from '@/lib/services/whatsapp-qr.service';
import { getUserSession } from '@/app/actions';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }
    
    // SECURITY CHECK: Verificar se a conexão pertence à empresa do usuário
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
    
    if (connection.companyId !== userCompanyId) {
      console.warn(`Security violation: User from company ${userCompanyId} tried to check status of connection from company ${connection.companyId}`);
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this connection' },
        { status: 403 }
      );
    }

    const whatsappService = WhatsAppQRService.getInstance();
    const status = await whatsappService.getStatus(connectionId);

    return NextResponse.json({
      success: true,
      connectionId,
      ...status,
    });
  } catch (error) {
    console.error('Error checking WhatsApp QR status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}