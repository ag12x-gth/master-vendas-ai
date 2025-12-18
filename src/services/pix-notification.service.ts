import { sendWhatsappTextMessage } from '@/lib/facebookApiService';
import { conn } from '@/lib/db';

export interface PixNotificationData {
  customerPhone: string;
  customerName: string;
  qrCode: string;
  pixExpirationAt: string;
  total: number;
  orderId: string;
  productName?: string;
}

export async function sendPixNotification(data: PixNotificationData): Promise<void> {
  try {
    const expirationDate = new Date(data.pixExpirationAt);
    const hours = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60));

    const message = `🎯 *${data.customerName}*, seu PIX foi gerado!\n\n💰 *Valor:* R$ ${data.total.toFixed(2)}\n⏰ *Válido por:* ${hours}h\n📦 *Produto:* ${data.productName || 'Sua compra'}\n\n👇 *Copie e cole o código PIX abaixo:*\n${data.qrCode}\n\nOu escaneie o QR Code se preferir.\n\n❓ Dúvidas? Estou aqui para ajudar!`;

    // Get connection for sending message
    const [connection] = await conn`
      SELECT id FROM connections 
      LIMIT 1
    `;

    if (connection) {
      await sendWhatsappTextMessage({
        connectionId: connection.id,
        to: data.customerPhone.replace(/[^0-9]/g, ''),
        text: message,
      });
    } else {
      console.warn('[PIX-NOTIFICATION] No WhatsApp connection available');
    }

    console.log(`✅ [PIX-NOTIFICATION] PIX notification sent to ${data.customerPhone}`);
  } catch (error) {
    console.error('❌ [PIX-NOTIFICATION] Error sending PIX notification:', error);
    throw error;
  }
}

export async function sendOrderApprovedNotification(data: {
  customerPhone: string;
  customerName: string;
  orderId: string;
  productName?: string;
  total: number;
}): Promise<void> {
  try {
    const message = `✅ *Pedido Confirmado!*\n\n🎉 ${data.customerName}, seu pagamento foi confirmado!\n\n📦 *Produto:* ${data.productName || 'Sua compra'}\n💰 *Valor:* R$ ${data.total.toFixed(2)}\n🔔 *Pedido:* ${data.orderId}\n\nVocê está recebendo acesso ao material AGORA!\n\n🚀 Aproveite ao máximo! Qualquer dúvida, estou aqui.`;

    // Get connection for sending message
    const [connection] = await conn`
      SELECT id FROM connections 
      LIMIT 1
    `;

    if (connection) {
      await sendWhatsappTextMessage({
        connectionId: connection.id,
        to: data.customerPhone.replace(/[^0-9]/g, ''),
        text: message,
      });
    } else {
      console.warn('[ORDER-NOTIFICATION] No WhatsApp connection available');
    }

    console.log(`✅ [ORDER-NOTIFICATION] Order approved notification sent to ${data.customerPhone}`);
  } catch (error) {
    console.error('❌ [ORDER-NOTIFICATION] Error sending order notification:', error);
    throw error;
  }
}
