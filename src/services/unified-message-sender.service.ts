'use server';

import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendWhatsappTextMessage } from '@/lib/facebookApiService';
import { sessionManager } from './baileys-session-manager';

export interface UnifiedSendOptions {
  provider: 'apicloud' | 'baileys';
  connectionId: string;
  to: string;
  message: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendUnifiedMessage(options: UnifiedSendOptions): Promise<SendResult> {
  const { provider, connectionId, to, message } = options;

  try {
    // Fetch connection
    const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));
    if (!connection) {
      return { success: false, error: `Conexão ${connectionId} não encontrada` };
    }

    if (provider === 'apicloud') {
      // Send via Meta/APICloud
      try {
        const result = await sendWhatsappTextMessage({
          connectionId,
          to,
          text: message,
        });
        console.log(`[UNIFIED-SENDER] ✅ Message sent via APICloud to ${to}`, result);
        return { success: true, messageId: (result as any)?.messages?.[0]?.id };
      } catch (error) {
        console.error(`[UNIFIED-SENDER] ❌ Failed to send via APICloud:`, error);
        return { success: false, error: (error as Error).message };
      }
    } else if (provider === 'baileys') {
      // Send via Baileys
      try {
        const phoneJid = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await sessionManager.sendMessage(connectionId, phoneJid, message);
        console.log(`[UNIFIED-SENDER] ✅ Message sent via Baileys to ${to}`);
        return { success: true, messageId: `baileys_${Date.now()}` };
      } catch (error) {
        console.error(`[UNIFIED-SENDER] ❌ Failed to send via Baileys:`, error);
        return { success: false, error: (error as Error).message };
      }
    }

    return { success: false, error: 'Provedor inválido' };
  } catch (error) {
    console.error(`[UNIFIED-SENDER] Error:`, error);
    return { success: false, error: (error as Error).message };
  }
}

export async function interpolateTemplate(template: string, params: Record<string, string>): Promise<string> {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}
