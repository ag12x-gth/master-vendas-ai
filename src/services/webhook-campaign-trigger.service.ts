import { conn } from '@/lib/db';
import { campaigns, contactLists, contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendCampaign } from '@/lib/campaign-sender';

interface TriggerContext {
  companyId: string;
  eventType: string;
  customer: {
    name: string;
    email: string;
    phoneNumber: string;
    document: string;
  };
  product?: {
    name: string;
  };
  plan?: {
    name: string;
  };
}

export async function triggerWebhookCampaign(context: TriggerContext): Promise<void> {
  const { companyId, eventType, customer } = context;

  try {
    console.log(`[WEBHOOK-CAMPAIGN] Triggering campaign for event: ${eventType}`);
    console.log(`[WEBHOOK-CAMPAIGN] Customer: ${customer.name} (${customer.phoneNumber})`);

    // Step 1: Find or create contact
    let [contact] = await conn`
      SELECT id FROM contacts 
      WHERE company_id = ${companyId} 
      AND (phone = ${customer.phoneNumber} OR email = ${customer.email})
      LIMIT 1
    `;

    if (!contact) {
      const result = await conn`
        INSERT INTO contacts 
        (company_id, name, email, phone, document, status, created_at)
        VALUES (${companyId}, ${customer.name}, ${customer.email}, ${customer.phoneNumber}, ${customer.document}, 'active', NOW())
        RETURNING id
      `;
      contact = (result as any)?.[0];
      console.log(`[WEBHOOK-CAMPAIGN] Contact created: ${contact.id}`);
    }

    // Step 2: Find appropriate campaign by event type
    let campaignId: string | null = null;

    if (eventType === 'pix_created') {
      // Find PIX confirmation campaign
      const result = await conn`
        SELECT id FROM campaigns 
        WHERE company_id = ${companyId}
        AND name ILIKE '%pix%' OR name ILIKE '%confirmação%'
        AND status = 'active'
        LIMIT 1
      `;
      campaignId = (result as any)?.[0]?.id || null;

      if (!campaignId) {
        console.warn('[WEBHOOK-CAMPAIGN] No PIX confirmation campaign found');
      } else {
        console.log(`[WEBHOOK-CAMPAIGN] Found PIX campaign: ${campaignId}`);
      }
    } else if (eventType === 'order_approved') {
      // Find upsell/follow-up campaign
      const result = await conn`
        SELECT id FROM campaigns 
        WHERE company_id = ${companyId}
        AND (name ILIKE '%upsell%' OR name ILIKE '%follow%' OR name ILIKE '%aprovado%')
        AND status = 'active'
        LIMIT 1
      `;
      campaignId = (result as any)?.[0]?.id || null;

      if (!campaignId) {
        console.warn('[WEBHOOK-CAMPAIGN] No follow-up campaign found');
      } else {
        console.log(`[WEBHOOK-CAMPAIGN] Found follow-up campaign: ${campaignId}`);
      }
    }

    if (!campaignId) {
      console.warn(`[WEBHOOK-CAMPAIGN] No suitable campaign found for event: ${eventType}`);
      return;
    }

    // Step 3: Dispatch campaign
    try {
      await sendCampaign(campaignId, [contact.id]);
      console.log(`[WEBHOOK-CAMPAIGN] ✅ Campaign dispatched successfully`);
    } catch (error) {
      console.error('[WEBHOOK-CAMPAIGN] Error dispatching campaign:', error);
    }
  } catch (error) {
    console.error('[WEBHOOK-CAMPAIGN] Error in webhook campaign trigger:', error);
  }
}
