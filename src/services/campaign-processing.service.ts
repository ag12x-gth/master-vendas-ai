import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq, and, lte, or, inArray } from 'drizzle-orm';
import { sendSmsCampaign, sendWhatsappCampaign } from '@/lib/campaign-sender';

export interface CampaignProcessingResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  timestamp: string;
}

function getBrasiliaTime(): string {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export async function processPendingCampaigns(): Promise<CampaignProcessingResult> {
  const now = new Date();
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  const pendingCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      or(
        inArray(campaigns.status, ['QUEUED', 'PENDING']),
        and(eq(campaigns.status, 'SCHEDULED'), lte(campaigns.scheduledAt, now))
      )
    );

  if (pendingCampaigns.length === 0) {
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      timestamp: getBrasiliaTime(),
    };
  }

  console.log(
    `[CampaignProcessor] Encontradas ${pendingCampaigns.length} campanhas para processar.`
  );

  const campaignPromises = pendingCampaigns.map(async (campaign) => {
    try {
      const updateResult = await db
        .update(campaigns)
        .set({ status: 'SENDING' })
        .where(
          and(
            eq(campaigns.id, campaign.id),
            or(
              inArray(campaigns.status, ['QUEUED', 'PENDING']),
              and(eq(campaigns.status, 'SCHEDULED'), lte(campaigns.scheduledAt, now))
            )
          )
        )
        .returning({ id: campaigns.id });

      if (!updateResult || updateResult.length === 0) {
        console.log(
          `[CampaignProcessor] Campanha ${campaign.id} já sendo processada por outra instância (CAS falhou). Pulando.`
        );
        return 'skipped';
      }

      console.log(
        `[CampaignProcessor] Lock adquirido para campanha ${campaign.id}. Iniciando envio.`
      );

      const channelUpper = campaign.channel?.toUpperCase();
      if (channelUpper === 'WHATSAPP') {
        await sendWhatsappCampaign(campaign);
        return 'success';
      } else if (channelUpper === 'SMS') {
        await sendSmsCampaign(campaign);
        return 'success';
      }

      return 'skipped';
    } catch (error) {
      console.error(`[CampaignProcessor] Erro ao processar campanha ${campaign.id}:`, error);
      return 'failed';
    }
  });

  const results = await Promise.allSettled(campaignPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value === 'success') successful++;
      else if (result.value === 'skipped') skipped++;
      else if (result.value === 'failed') failed++;
    } else {
      failed++;
    }
  }

  console.log(
    `[CampaignProcessor] Processamento concluído: ${successful} sucesso, ${failed} falhas, ${skipped} puladas`
  );

  return {
    processed: pendingCampaigns.length,
    successful,
    failed,
    skipped,
    timestamp: getBrasiliaTime(),
  };
}
