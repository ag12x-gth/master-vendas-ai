// src/app/api/v1/campaigns/trigger/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { campaigns } from '@/lib/db/schema';
import { eq, and, lte, or, inArray } from 'drizzle-orm';
import { sendSmsCampaign, sendWhatsappCampaign } from '@/lib/campaign-sender';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de CRON para processar TODAS as campanhas pendentes.
 * Busca campanhas agendadas, na fila ou pendentes e as envia.
 */
export async function GET(_request: NextRequest) {
  /*
  // A autenticação pode ser reativada no futuro se necessário.
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.META_VERIFY_TOKEN}`;

  if (!authHeader || authHeader !== expectedToken) {
    console.warn('[CRON] Tentativa de acesso não autorizada ao endpoint de trigger.');
    return new NextResponse('Unauthorized', { status: 401 });
  }
  */

  const getBrasiliaTime = (): string => {
    return new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  try {
    const now = new Date();
    
    // Busca campanhas que estão prontas para serem processadas
    const pendingCampaigns = await db
      .select()
      .from(campaigns)
      .where(or(
        inArray(campaigns.status, ['QUEUED', 'PENDING']),
        and(
            eq(campaigns.status, 'SCHEDULED'),
            lte(campaigns.scheduledAt, now)
        )
      ));

    if (pendingCampaigns.length === 0) {
      return NextResponse.json({ 
        now: getBrasiliaTime(),
        message: 'Nenhuma campanha pendente para executar.', 
        processed: 0 
      });
    }

    console.log(`[CRON] Encontradas ${pendingCampaigns.length} campanhas para processar.`);

    // CAS (Compare-And-Set) Update Atômico para prevenir duplicação em CRON concorrentes
    const campaignPromises = pendingCampaigns.map(async (campaign) => {
        try {
            // Tenta adquirir lock atômico via UPDATE condicional
            const updateResult = await db
                .update(campaigns)
                .set({ status: 'SENDING' })
                .where(and(
                    eq(campaigns.id, campaign.id),
                    or(
                        inArray(campaigns.status, ['QUEUED', 'PENDING']),
                        and(
                            eq(campaigns.status, 'SCHEDULED'),
                            lte(campaigns.scheduledAt, now)
                        )
                    )
                ))
                .returning({ id: campaigns.id });

            // Verifica se conseguiu o lock (1 linha retornada = sucesso, 0 = outra instância pegou)
            if (!updateResult || updateResult.length === 0) {
                console.log(`[CRON] Campanha ${campaign.id} já sendo processada por outra instância (CAS falhou). Pulando.`);
                return;
            }

            console.log(`[CRON] Lock adquirido para campanha ${campaign.id}. Iniciando envio.`);

            // Envia a campanha
            const channelUpper = campaign.channel?.toUpperCase();
            if (channelUpper === 'WHATSAPP') {
                return sendWhatsappCampaign(campaign);
            } else if (channelUpper === 'SMS') {
                return sendSmsCampaign(campaign);
            }
        } catch (error) {
            console.error(`[CRON] Erro ao processar campanha ${campaign.id}:`, error);
            throw error;
        }
    });
    
    // Executa o envio em paralelo mas espera por todas para responder.
    await Promise.allSettled(campaignPromises);

    return NextResponse.json({
      now: getBrasiliaTime(),
      message: `${pendingCampaigns.length} campanhas foram processadas.`,
      processed: pendingCampaigns.length,
    });

  } catch (error) {
    console.error('Erro geral no endpoint do cron de campanhas:', error);
    return NextResponse.json({ 
        now: getBrasiliaTime(),
        error: 'Erro interno do servidor.' 
    }, { status: 500 });
  }
}
