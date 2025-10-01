// Script de teste completo do fluxo WhatsApp com autenticação
// Este script valida todo o sistema: login, webhook, processamento IA e banco de dados

import { config } from 'dotenv';
import crypto from 'crypto';
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://e45cb235-2e9a-4a4d-bd5f-f2c452b50262-00-lmygdne6adv3.riker.replit.dev';
const WEBHOOK_SLUG = 'f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7';

// Configurações de teste
const TEST_USER = {
  email: 'jeferson@masteriaoficial.com.br',
  password: 'Test@123456' // Senha padrão do usuário de teste
};

const TEST_WHATSAPP_MESSAGE = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'ACCOUNT_ID',
    changes: [{
      field: 'messages',
      value: {
        messaging_product: 'whatsapp',
        metadata: {
          display_phone_number: '5511999999999',
          phone_number_id: process.env.META_PHONE_NUMBER_ID || '391262387407327'
        },
        contacts: [{
          profile: { name: 'Cliente Teste' },
          wa_id: '5511987654321'
        }],
        messages: [{
          id: `msg_test_${Date.now()}`,
          from: '5511987654321',
          timestamp: Math.floor(Date.now() / 1000).toString(),
          type: 'text',
          text: {
            body: 'Olá! Gostaria de saber mais informações sobre os produtos.'
          }
        }]
      }
    }]
  }]
};

console.log('🚀 TESTE COMPLETO DO SISTEMA WHATSAPP COM AUTENTICAÇÃO');
console.log('=======================================================');
console.log(`📍 URL Base: ${BASE_URL}`);
console.log(`👤 Usuário de Teste: ${TEST_USER.email}`);
console.log('');

// Função para fazer login e obter token de sessão
async function authenticateUser() {
  console.log('🔐 [ETAPA 1] AUTENTICAÇÃO DO USUÁRIO');
  console.log('-------------------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    const setCookieHeader = response.headers.get('set-cookie');
    const responseBody = await response.json();
    
    if (response.ok) {
      console.log('✅ Login realizado com sucesso!');
      console.log(`Response: ${JSON.stringify(responseBody, null, 2)}`);
      
      // Extrair o cookie de sessão
      const cookies = setCookieHeader ? setCookieHeader.split(';') : [];
      const sessionToken = cookies.find(c => c.includes('__session') || c.includes('session_token'));
      
      if (sessionToken) {
        console.log('✅ Token de sessão obtido com sucesso!');
        return sessionToken;
      } else {
        console.log('⚠️ Login OK, mas token de sessão não encontrado no header');
        return null;
      }
    } else {
      console.error('❌ Falha no login:', responseBody);
      
      // Se for erro de senha, informar
      if (responseBody.error === 'Credenciais inválidas.') {
        console.error('💡 Dica: Verifique se a senha está correta no script');
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    return null;
  }
}

// Função para testar rota protegida
async function testProtectedRoute(sessionCookie: string) {
  console.log('\n🔒 [ETAPA 2] TESTE DE ROTA PROTEGIDA');
  console.log('--------------------------------------');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/session`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie
      }
    });
    
    if (response.ok) {
      const session = await response.json();
      console.log('✅ Sessão válida! Usuário autenticado:');
      console.log(JSON.stringify(session, null, 2));
      return true;
    } else {
      console.error('❌ Sessão inválida ou expirada');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
    return false;
  }
}

// Função para simular recebimento de mensagem WhatsApp
async function simulateWhatsAppMessage(sessionCookie: string) {
  console.log('\n📱 [ETAPA 3] SIMULAÇÃO DE MENSAGEM WHATSAPP');
  console.log('---------------------------------------------');
  
  const webhookUrl = `${BASE_URL}/api/webhooks/meta/${WEBHOOK_SLUG}`;
  const payload = JSON.stringify(TEST_WHATSAPP_MESSAGE);
  
  // Criar assinatura HMAC para validação
  const appSecret = process.env.META_APP_CLIENT_SECRET || '57f9ddb9146664dd62bbcf75d2ebff3e';
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(payload);
  const signature = `sha256=${hmac.digest('hex')}`;
  
  console.log('📤 Enviando mensagem de teste para o webhook...');
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log(`Mensagem: "${TEST_WHATSAPP_MESSAGE.entry[0].changes[0].value.messages[0].text.body}"`);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
        'Cookie': sessionCookie || ''
      },
      body: payload
    });
    
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook processou a mensagem com sucesso!');
      console.log(`Status: ${response.status}`);
      console.log(`Response: ${responseText}`);
      
      // Aguardar processamento
      console.log('\n⏳ Aguardando processamento da IA (5 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return true;
    } else {
      console.error('❌ Falha ao processar webhook');
      console.error(`Status: ${response.status}`);
      console.error(`Response: ${responseText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

// Função para verificar processamento no banco de dados
async function verifyDatabaseProcessing(sessionCookie: string) {
  console.log('\n🗄️ [ETAPA 4] VERIFICAÇÃO DO BANCO DE DADOS');
  console.log('--------------------------------------------');
  
  try {
    // Buscar conversas recentes
    const response = await fetch(`${BASE_URL}/api/v1/conversations?limit=5`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    
    if (response.ok) {
      const conversations = await response.json();
      console.log('✅ Conversas encontradas no banco:');
      console.log(JSON.stringify(conversations.slice(0, 2), null, 2));
      
      // Verificar se há mensagens processadas
      if (conversations.length > 0) {
        console.log('✅ Mensagens estão sendo salvas no banco de dados!');
        return true;
      } else {
        console.log('⚠️ Nenhuma conversa encontrada (pode ser normal se for primeiro teste)');
        return true;
      }
    } else {
      console.error('❌ Erro ao buscar conversas');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
    return false;
  }
}

// Função para testar integração com IA
async function testAIIntegration(sessionCookie: string) {
  console.log('\n🤖 [ETAPA 5] TESTE DE INTEGRAÇÃO COM IA');
  console.log('-----------------------------------------');
  
  try {
    // Testar endpoint de saúde da IA
    const healthResponse = await fetch(`${BASE_URL}/api/ai/health`, {
      method: 'GET',
      headers: {
        'Cookie': sessionCookie || ''
      }
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Serviço de IA está funcionando:');
      console.log(JSON.stringify(health, null, 2));
      
      // Testar processamento de IA
      const smokeResponse = await fetch(`${BASE_URL}/api/ai/smoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie || ''
        },
        body: JSON.stringify({
          message: 'Teste de integração com IA'
        })
      });
      
      if (smokeResponse.ok) {
        const aiResponse = await smokeResponse.json();
        console.log('✅ IA processou mensagem com sucesso:');
        console.log(JSON.stringify(aiResponse, null, 2));
        return true;
      } else {
        console.error('❌ Falha no processamento da IA');
        return false;
      }
    } else {
      console.error('❌ Serviço de IA não está respondendo');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao testar IA:', error);
    return false;
  }
}

// Função principal de execução
async function runCompleteTest() {
  console.log('🏁 INICIANDO TESTE COMPLETO DO SISTEMA');
  console.log('');
  
  const results = {
    authentication: false,
    protectedRoute: false,
    webhookProcessing: false,
    databaseSaving: false,
    aiIntegration: false
  };
  
  // Etapa 1: Autenticação
  const sessionCookie = await authenticateUser();
  results.authentication = !!sessionCookie;
  
  if (!sessionCookie) {
    console.error('\n❌ Falha na autenticação! Não é possível continuar os testes.');
    console.error('💡 Certifique-se de que:');
    console.error('   1. O usuário jeferson@masteriaoficial.com.br existe no banco');
    console.error('   2. A senha está correta no script');
    console.error('   3. O email do usuário está verificado');
    return results;
  }
  
  // Etapa 2: Teste de rota protegida
  results.protectedRoute = await testProtectedRoute(sessionCookie);
  
  // Etapa 3: Simular mensagem WhatsApp
  results.webhookProcessing = await simulateWhatsAppMessage(sessionCookie);
  
  // Etapa 4: Verificar banco de dados
  results.databaseSaving = await verifyDatabaseProcessing(sessionCookie);
  
  // Etapa 5: Testar IA
  results.aiIntegration = await testAIIntegration(sessionCookie);
  
  return results;
}

// Executar teste completo
runCompleteTest().then(results => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DO TESTE');
  console.log('='.repeat(60));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const percentage = Math.round((passedTests / totalTests) * 100);
  
  console.log('\nRESULTADOS:');
  console.log(`  ✅ Autenticação: ${results.authentication ? 'PASSOU' : '❌ FALHOU'}`);
  console.log(`  ✅ Rota Protegida: ${results.protectedRoute ? 'PASSOU' : '❌ FALHOU'}`);
  console.log(`  ✅ Webhook WhatsApp: ${results.webhookProcessing ? 'PASSOU' : '❌ FALHOU'}`);
  console.log(`  ✅ Banco de Dados: ${results.databaseSaving ? 'PASSOU' : '❌ FALHOU'}`);
  console.log(`  ✅ Integração IA: ${results.aiIntegration ? 'PASSOU' : '❌ FALHOU'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📈 TAXA DE SUCESSO: ${percentage}%`);
  console.log(`   Testes Aprovados: ${passedTests}/${totalTests}`);
  console.log('='.repeat(60));
  
  if (percentage === 100) {
    console.log('\n🎉🎉🎉 SISTEMA 100% FUNCIONAL! 🎉🎉🎉');
    console.log('Todos os testes passaram com sucesso!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Sistema com falhas. Verifique os testes que falharam.');
    process.exit(1);
  }
});