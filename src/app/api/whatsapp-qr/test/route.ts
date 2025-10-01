import { NextRequest, NextResponse } from 'next/server';
import WhatsAppQRService from '@/lib/services/whatsapp-qr.service';
import { db } from '@/lib/db';
import { connections, whatsappQrSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Endpoint de teste sem autenticação para validar funcionalidade
export async function POST(request: NextRequest) {
  console.log('[WhatsApp QR Test] ====== TEST ENDPOINT CALLED ======');
  console.log('[WhatsApp QR Test] Timestamp:', new Date().toISOString());
  
  try {
    const { connectionId = 'bf9bdff3-fefa-4ac4-b981-3dc795cc0387' } = await request.json();
    const testCompanyId = 'test-company-id';
    
    console.log('[WhatsApp QR Test] Connection ID:', connectionId);
    console.log('[WhatsApp QR Test] Test Company ID:', testCompanyId);
    
    // Criar conexão de teste se não existir
    const [existingConnection] = await db.select()
      .from(connections)
      .where(eq(connections.id, connectionId))
      .limit(1);
    
    if (!existingConnection) {
      console.log('[WhatsApp QR Test] Creating test connection...');
      await db.insert(connections)
        .values({
          companyId: testCompanyId,
          config_name: 'Test WhatsApp Connection',
          wabaId: 'test-waba-id',
          phoneNumberId: 'test-phone-id',
          accessToken: 'test-token',
          webhookSecret: 'test-webhook-secret',
          appSecret: 'test-app-secret',
          connectionType: 'whatsapp_qr',
          isActive: false,
        })
        .onConflictDoNothing();
    }
    
    // Verificar/criar sessão
    const [existingSession] = await db.select()
      .from(whatsappQrSessions)
      .where(eq(whatsappQrSessions.connectionId, connectionId))
      .limit(1);
    
    if (!existingSession) {
      console.log('[WhatsApp QR Test] Creating session record...');
      await db.insert(whatsappQrSessions)
        .values({
          connectionId,
          isActive: false,
        });
    }
    
    // Iniciar conexão WhatsApp
    console.log('[WhatsApp QR Test] Initializing WhatsApp service...');
    const whatsappService = WhatsAppQRService.getInstance();
    
    // Verificar se Socket.IO está configurado
    const io = (global as any).io;
    if (io) {
      console.log('[WhatsApp QR Test] Socket.IO is available');
      whatsappService.setSocketIO(io);
    } else {
      console.warn('[WhatsApp QR Test] Socket.IO not available in global scope');
    }
    
    console.log('[WhatsApp QR Test] Starting connection session...');
    await whatsappService.connectSession(connectionId, testCompanyId);
    
    // Aguardar um pouco para permitir inicialização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar status
    const status = await whatsappService.getStatus(connectionId);
    console.log('[WhatsApp QR Test] Status:', JSON.stringify(status));
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp QR test connection initiated',
      connectionId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WhatsApp QR Test] Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  console.log('[WhatsApp QR Test] GET Status check');
  
  const connectionId = 'bf9bdff3-fefa-4ac4-b981-3dc795cc0387';
  
  try {
    const whatsappService = WhatsAppQRService.getInstance();
    const status = await whatsappService.getStatus(connectionId);
    
    // Verificar sessão no banco
    const [session] = await db.select()
      .from(whatsappQrSessions)
      .where(eq(whatsappQrSessions.connectionId, connectionId))
      .limit(1);
    
    return NextResponse.json({
      success: true,
      connectionId,
      serviceStatus: status,
      dbSession: session || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WhatsApp QR Test] Error getting status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}