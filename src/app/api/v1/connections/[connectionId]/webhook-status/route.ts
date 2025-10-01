// src/app/api/v1/connections/[connectionId]/webhook-status/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { decrypt } from '@/lib/crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v20.0';

async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
    const url = `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    const data = await response.json();
    if (!response.ok || !data.access_token) {
        console.error("Falha ao obter o App Access Token:", data);
        throw new Error("Não foi possível obter o Token de Acesso do Aplicativo da Meta.");
    }
    return data.access_token;
}

export async function GET(request: NextRequest, { params }: { params: { connectionId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { connectionId } = params;

        const [connection] = await db.select().from(connections).where(and(eq(connections.id, connectionId), eq(connections.companyId, companyId)));
        if (!connection || !connection.appId) {
            return NextResponse.json({ error: 'Conexão ou App ID não encontrado.' }, { status: 404 });
        }
        
        const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
        if (!company || !company.webhookSlug) {
             return NextResponse.json({ error: 'Configuração da empresa incompleta (slug do webhook ausente).' }, { status: 500 });
        }

        const appSecret = decrypt(connection.appSecret);
        if (!appSecret) {
            return NextResponse.json({ error: 'App Secret não encontrado ou falha na desencriptação.' }, { status: 400 });
        }
        
        const appAccessToken = await getAppAccessToken(connection.appId, appSecret);
        
        const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.appId}/subscriptions?access_token=${appAccessToken}&fields=callback_url,subscribed_fields`;
        
        const response = await fetch(url, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
            console.error("Erro ao buscar subscrição do webhook da Meta:", data);
            throw new Error(data.error?.message || 'Falha ao comunicar com a API da Meta.');
        }

        const subscription = data.data?.[0]; // Assume only one subscription for whatsapp_business_account
        
        if (!subscription || !subscription.callback_url) {
            return NextResponse.json({ status: 'NAO_CONFIGURADO' });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
          throw new Error("A variável de ambiente NEXT_PUBLIC_BASE_URL não está configurada.");
        }
        const expectedUrl = `${baseUrl}/api/webhooks/meta/${company.webhookSlug}`;

        if (subscription.callback_url !== expectedUrl) {
            return NextResponse.json({ status: 'DIVERGENTE', metaUrl: subscription.callback_url, expectedUrl });
        }

        return NextResponse.json({ status: 'CONFIGURADO' });
        
    } catch (error) {
        console.error(`Erro ao verificar status do webhook para a conexão ${params.connectionId}:`, error);
        return NextResponse.json({ status: 'ERRO', error: (error as Error).message }, { status: 500 });
    }
}
