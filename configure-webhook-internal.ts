// Script interno para configurar o webhook com a Meta/WhatsApp API

import { db } from './src/lib/db';
import { connections, companies } from './src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from './src/lib/crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v23.0';
const WEBHOOK_FIELDS = 'messages,message_template_status_update,account_update';

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

async function configureWebhookInternal() {
    console.log('============================================================');
    console.log('CONFIGURAÇÃO INTERNA DO WEBHOOK META/WHATSAPP');
    console.log('============================================================');
    
    try {
        // 1. Buscar a conexão ativa
        const connectionId = '51d60e9b-b308-4193-85d7-192ff6f4e3d8';
        const webhookSlug = 'f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7';
        
        console.log('\n📋 Informações da Configuração:');
        console.log(`   Connection ID: ${connectionId}`);
        console.log(`   Webhook Slug: ${webhookSlug}`);
        
        // 2. Buscar dados da conexão e empresa
        const [connection] = await db
            .select()
            .from(connections)
            .where(eq(connections.id, connectionId));
            
        if (!connection) {
            throw new Error('Conexão não encontrada!');
        }
        
        const [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, connection.companyId));
            
        if (!company || !company.webhookSlug) {
            throw new Error('Configuração da empresa incompleta!');
        }
        
        console.log('\n✅ Conexão encontrada:');
        console.log(`   Config Name: ${connection.config_name}`);
        console.log(`   WABA ID: ${connection.wabaId}`);
        console.log(`   App ID: ${connection.appId}`);
        console.log(`   Status: ${connection.isActive ? 'Ativa' : 'Inativa'}`);
        
        // 3. Desencriptar credenciais
        const appId = connection.appId;
        const appSecret = decrypt(connection.appSecret);
        
        if (!appId || !appSecret) {
            throw new Error('Credenciais incompletas ou corrompidas!');
        }
        
        console.log('\n🔐 Credenciais desencriptadas com sucesso');
        
        // 4. Obter App Access Token
        console.log('\n🔑 Obtendo App Access Token da Meta...');
        const appAccessToken = await getAppAccessToken(appId, appSecret);
        console.log('   Token obtido com sucesso!');
        
        // 5. Configurar URLs
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://e45cb235-2e9a-4a4d-bd5f-f2c452b50262-00-1mygdne6adv3.riker.replit.dev';
        const callbackUrl = `${baseUrl}/api/webhooks/meta/${company.webhookSlug}`;
        const verifyToken = process.env.META_VERIFY_TOKEN || 'zapmaster_verify_2024';
        
        console.log('\n🔗 URLs de Configuração:');
        console.log(`   Base URL: ${baseUrl}`);
        console.log(`   Callback URL: ${callbackUrl}`);
        console.log(`   Verify Token: ${verifyToken}`);
        
        // 6. Excluir assinatura antiga
        console.log('\n🗑️  Removendo assinatura antiga (se existir)...');
        const deleteUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${appId}/subscriptions?object=whatsapp_business_account&access_token=${appAccessToken}`;
        
        try {
            const deleteResponse = await fetch(deleteUrl, { method: 'DELETE' });
            const deleteData = await deleteResponse.json();
            
            if (deleteResponse.ok) {
                console.log('   Assinatura antiga removida com sucesso');
            } else if (deleteData.error?.code === 100) {
                console.log('   Nenhuma assinatura antiga encontrada');
            } else {
                console.warn('   Aviso:', deleteData.error?.message || 'Erro ao remover assinatura antiga');
            }
        } catch (error) {
            console.warn('   Erro ao tentar remover assinatura antiga:', error);
        }
        
        // 7. Criar nova assinatura
        console.log('\n✨ Criando nova assinatura do webhook...');
        
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
            throw new Error(createResponseData.error?.message || 'Falha ao configurar webhook');
        }
        
        console.log('   ✅ WEBHOOK CONFIGURADO COM SUCESSO!');
        console.log('   Resposta da Meta:', JSON.stringify(createResponseData, null, 2));
        
        // 8. Verificar status
        console.log('\n🔍 Verificando status do webhook...');
        const statusUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${appId}/subscriptions?access_token=${appAccessToken}&fields=callback_url,subscribed_fields`;
        
        const statusResponse = await fetch(statusUrl);
        const statusData = await statusResponse.json();
        
        if (statusResponse.ok && statusData.data?.[0]) {
            const subscription = statusData.data[0];
            console.log('\n📊 Status do Webhook:');
            console.log(`   Callback URL: ${subscription.callback_url}`);
            console.log(`   Campos Assinados: ${subscription.subscribed_fields}`);
            
            if (subscription.callback_url === callbackUrl) {
                console.log('   ✅ URL de callback corresponde à configurada!');
            } else {
                console.log('   ⚠️ URL de callback divergente!');
                console.log(`   Esperado: ${callbackUrl}`);
                console.log(`   Configurado: ${subscription.callback_url}`);
            }
        }
        
        // 9. Teste final
        console.log('\n🧪 Testando URL de callback...');
        const testChallenge = 'TEST_' + Date.now();
        const testUrl = `${callbackUrl}?hub.mode=subscribe&hub.challenge=${testChallenge}&hub.verify_token=${verifyToken}`;
        
        try {
            const testResponse = await fetch(testUrl);
            const testData = await testResponse.text();
            
            if (testResponse.status === 200 && testData === testChallenge) {
                console.log('   ✅ Teste de verificação passou!');
            } else {
                console.log('   ⚠️ Teste de verificação falhou');
                console.log(`   Status: ${testResponse.status}`);
                console.log(`   Resposta: ${testData.substring(0, 100)}`);
            }
        } catch (error) {
            console.log('   ❌ Erro no teste:', error);
        }
        
        console.log('\n============================================================');
        console.log('CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('============================================================');
        console.log('\n✅ Webhook sincronizado com a Meta/WhatsApp API');
        console.log(`📱 WABA ID: ${connection.wabaId}`);
        console.log(`🔗 Callback URL: ${callbackUrl}`);
        console.log(`🔐 Verify Token: ${verifyToken}`);
        console.log('\nO webhook está pronto para receber mensagens!');
        
    } catch (error) {
        console.error('\n❌ ERRO NA CONFIGURAÇÃO:', error);
        throw error;
    }
}

// Executar o script
configureWebhookInternal()
    .then(() => {
        console.log('\n✨ Script executado com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Falha na execução:', error);
        process.exit(1);
    });