'use server';

import { db } from '@/lib/db';
import { connections, messageTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendWhatsappTextMessage, sendWhatsappTemplateMessage } from '@/lib/facebookApiService';
import { sessionManager } from './baileys-session-manager';

export interface UnifiedSendOptions {
  provider: 'apicloud' | 'baileys';
  connectionId: string;
  to: string;
  message: string;
  templateId?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendUnifiedMessage(options: UnifiedSendOptions): Promise<SendResult> {
  const { provider, connectionId, to, message, templateId, templateName: providedTemplateName, templateParams: _templateParams } = options;

  try {
    // Fetch connection
    const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));
    if (!connection) {
      return { success: false, error: `Conexão ${connectionId} não encontrada` };
    }

    if (provider === 'apicloud') {
      // ✅ v2.10.7: Use template if templateId is provided
      if (templateId) {
        try {
          // Fetch template info
          const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, templateId));
          if (!template) {
            console.warn(`[UNIFIED-SENDER] Template ${templateId} not found, falling back to text`);
          } else {
            const templateName = providedTemplateName || template.name;
            const languageCode = template.language || 'pt_BR';
            console.log(`[UNIFIED-SENDER] Sending template: ${templateName} (${languageCode}) to ${to}`);
            
            const result = await sendWhatsappTemplateMessage({
              connectionId,
              to,
              templateName,
              languageCode,
              components: [], // Empty components for basic template
            });
            console.log(`[UNIFIED-SENDER] ✅ Template message sent via APICloud to ${to}`, result);
            return { success: true, messageId: (result as any)?.messages?.[0]?.id };
          }
        } catch (error) {
          console.warn(`[UNIFIED-SENDER] Failed to send template, falling back to text:`, error);
        }
      }

      // Fallback: Send as text
      try {
        // Only send text if message is not empty
        if (!message) {
          console.warn(`[UNIFIED-SENDER] No message and no valid template for ${to}, skipping`);
          return { success: false, error: 'Nenhuma mensagem ou template válido fornecido' };
        }
        
        const result = await sendWhatsappTextMessage({
          connectionId,
          to,
          text: message,
        });
        console.log(`[UNIFIED-SENDER] ✅ Text message sent via APICloud to ${to}`, result);
        return { success: true, messageId: (result as any)?.messages?.[0]?.id };
      } catch (error) {
        console.error(`[UNIFIED-SENDER] ❌ Failed to send via APICloud:`, error);
        return { success: false, error: (error as Error).message };
      }
    } else if (provider === 'baileys') {
      // Send via Baileys
      try {
        if (!message) {
          console.warn(`[UNIFIED-SENDER] No message for Baileys to ${to}, skipping`);
          return { success: false, error: 'Nenhuma mensagem fornecida' };
        }
        
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
