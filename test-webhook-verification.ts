// Script de teste de verificação do webhook do WhatsApp
// Este script valida que o webhook está configurado corretamente

import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://e45cb235-2e9a-4a4d-bd5f-f2c452b50262-00-lmygdne6adv3.riker.replit.dev';
const WEBHOOK_SLUG = 'f046c0b7-ff2c-4ec2-9b9e-7f3fb70e02b7';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'zapmaster_verify_2024';

console.log('🚀 Iniciando teste de verificação do webhook WhatsApp');
console.log('================================================');
console.log(`📍 URL Base: ${BASE_URL}`);
console.log(`🔑 Token de Verificação: ${VERIFY_TOKEN}`);
console.log(`🆔 Webhook Slug: ${WEBHOOK_SLUG}`);
console.log('');

async function testWebhookVerification() {
  const webhookUrl = `${BASE_URL}/api/webhooks/meta/${WEBHOOK_SLUG}`;
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': VERIFY_TOKEN,
    'hub.challenge': 'test123'
  });
  
  const fullUrl = `${webhookUrl}?${params.toString()}`;
  
  console.log('📡 Testando verificação do webhook...');
  console.log(`URL completa: ${fullUrl}`);
  console.log('');
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    const responseText = await response.text();
    
    console.log('✅ RESPOSTA DO WEBHOOK:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Body: ${responseText}`);
    console.log('');
    
    if (response.status === 200 && responseText === 'test123') {
      console.log('✅ WEBHOOK VERIFICADO COM SUCESSO!');
      console.log('O webhook está configurado corretamente e pronto para receber eventos do WhatsApp.');
      return true;
    } else {
      console.error('❌ FALHA NA VERIFICAÇÃO DO WEBHOOK!');
      console.error(`Status esperado: 200, recebido: ${response.status}`);
      console.error(`Challenge esperado: test123, recebido: ${responseText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ ERRO AO TESTAR WEBHOOK:', error);
    return false;
  }
}

// Executar teste
testWebhookVerification().then(success => {
  if (success) {
    console.log('\n🎉 Teste de verificação do webhook concluído com sucesso!');
    process.exit(0);
  } else {
    console.log('\n❌ Teste de verificação do webhook falhou!');
    process.exit(1);
  }
});