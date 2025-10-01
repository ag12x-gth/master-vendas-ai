// src/app/api/v1/connections/[connectionId]/configure-webhook/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { decrypt } from '@/lib/crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';

// Lista essencial de eventos de webhook que alimentam o sistema.
const WEBHOOK_FIELDS = 'messages,message_template_status_update,account_update';

/**
 * Obtém um App Access Token da Meta, que é necessário para gerir subscrições de webhook.
 */
async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
    const url = `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.access_token) {
        console.error("Failed to get App Access Token:", data);
        throw new Error("Não foi possível obter o Token de Acesso do Aplicativo da Meta.");
    }
    return data.access_token;
}


export async function POST(request: NextRequest, { params }: { params: { connectionId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { connectionId } = params;
        
        // 1. Buscar a conexão e a empresa associada
        const [connection] = await db.select().from(connections).where(and(eq(connections.id, connectionId), eq(connections.companyId, companyId)));
        if (!connection) {
            return NextResponse.json({ error: 'Conexão não encontrada ou não pertence à sua empresa.' }, { status: 404 });
        }
        
        const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
        if (!company || !company.webhookSlug) {
             return NextResponse.json({ error: 'Configuração da empresa incompleta (slug do webhook ausente).' }, { status: 500 });
        }

        // 2. Desencriptar as credenciais
        const appId = connection.appId;
        const appSecret = decrypt(connection.appSecret);
        
        if (!appId || !appSecret) {
            return NextResponse.json({ error: 'Credenciais da conexão (App ID ou App Secret) estão incompletas ou corrompidas.' }, { status: 400 });
        }
        
        // 3. Obter o App Access Token
        const appAccessToken = await getAppAccessToken(appId, appSecret);
        
        // 4. Gerar a URL de Callback e Token de Verificação
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        if (!baseUrl) {
          throw new Error("A variável de ambiente NEXT_PUBLIC_BASE_URL não está configurada. Não é possível construir a URL de callback.");
        }
        const callbackUrl = `${baseUrl}/api/webhooks/meta/${company.webhookSlug}`;
        const verifyToken = process.env.META_VERIFY_TOKEN; 

        if (!verifyToken) {
            return NextResponse.json({ error: 'Token de verificação do webhook do servidor não configurado.' }, { status: 500 });
        }
        
        // =================================================================
        // PASSO 5: EXCLUIR ASSINATURA ANTIGA (GARANTIR UM ESTADO LIMPO)
        // =================================================================
        console.log(`[Webhook Sync] Tentando excluir assinatura antiga para o App ID: ${appId}`);
        // A exclusão de subscrição requer o App Access Token.
        const deleteUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${appId}/subscriptions?object=whatsapp_business_account&access_token=${appAccessToken}`;
        const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });
        
        const deleteData = await deleteResponse.json();
        if (!deleteResponse.ok && deleteData.error?.code !== 100) { // Ignora erro "not found"
            console.warn('[Webhook Sync] Não foi possível excluir a assinatura antiga (pode não existir):', deleteData);
        } else {
             console.log('[Webhook Sync] Resposta da exclusão:', deleteData);
        }

        // =================================================================
        // PASSO 6: CRIAR NOVA ASSINATURA
        // =================================================================
        const form = new URLSearchParams();
        form.append('object', 'whatsapp_business_account');
        form.append('callback_url', callbackUrl);
        form.append('verify_token', verifyToken);
        form.append('fields', WEBHOOK_FIELDS);

        const createUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${appId}/subscriptions?access_token=${appAccessToken}`;

        const createResponse = await fetch(createUrl, {
            method: 'POST',
            body: form,
        });
        
        const createResponseData = await createResponse.json();

        if (!createResponse.ok) {
            console.error('Meta Webhook Subscription Error:', createResponseData);
            throw new Error(createResponseData.error?.message || 'Falha ao configurar a subscrição do webhook na Meta.');
        }

        return NextResponse.json({ success: true, message: 'Webhook configurado e sincronizado com a Meta com sucesso!' });

    } catch (error) {
        console.error('Erro ao configurar webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
