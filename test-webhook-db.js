const https = require('https');
const crypto = require('crypto');

const WEBHOOK_URL = 'e45cb235-2e9a-4a4d-bd5f-f2c452b50262-00-lmygdne6adv3.riker.replit.dev';
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';

function sendWebhookEvent(eventType, payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  
  let headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8')
  };
  
  if (WEBHOOK_SECRET) {
    const hmacPayload = `${timestamp}.${body}`;
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET)
      .update(hmacPayload)
      .digest('hex');
    
    headers['x-signature'] = signature;
    headers['x-timestamp'] = timestamp.toString();
  }

  const options = {
    hostname: WEBHOOK_URL,
    port: 443,
    path: '/api/vapi/webhook',
    method: 'POST',
    headers: headers
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${eventType}: ${res.statusCode}`);
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testDatabaseIntegration() {
  console.log('🎯 TESTE DE INTEGRAÇÃO COM BANCO DE DADOS\n');

  const callId = 'db-test-call-' + Date.now();
  const customerId = 'test-customer-db';

  try {
    console.log('1️⃣ Testando call-started (INSERT)...');
    await sendWebhookEvent('call-started', {
      type: 'call-started',
      call: {
        id: callId,
        assistantId: process.env.VAPI_ASSISTANT_ID || 'ba9630ff-410d-4c91-92b7-c98d12667455',
        customer: {
          number: '+5511987654321',
          name: 'Cliente Teste DB'
        },
        startedAt: new Date().toISOString()
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n2️⃣ Testando transcript (INSERT transcrição 1)...');
    await sendWebhookEvent('transcript', {
      type: 'transcript',
      call: { id: callId },
      transcript: {
        role: 'user',
        text: 'Olá, preciso de ajuda com meu pedido'
      },
      timestamp: new Date().toISOString()
    });
    await new Promise(r => setTimeout(r, 800));

    console.log('\n3️⃣ Testando transcript (INSERT transcrição 2)...');
    await sendWebhookEvent('transcript', {
      type: 'transcript',
      call: { id: callId },
      transcript: {
        role: 'assistant',
        text: 'Claro! Vou verificar seu pedido agora. Me diga o número do pedido, por favor.'
      },
      timestamp: new Date().toISOString()
    });
    await new Promise(r => setTimeout(r, 800));

    console.log('\n4️⃣ Testando call-ended (UPDATE)...');
    await sendWebhookEvent('call-ended', {
      type: 'call-ended',
      call: {
        id: callId,
        assistantId: process.env.VAPI_ASSISTANT_ID || 'ba9630ff-410d-4c91-92b7-c98d12667455',
        customer: {
          number: '+5511987654321',
          name: 'Cliente Teste DB'
        },
        startedAt: new Date(Date.now() - 45000).toISOString(),
        endedAt: new Date().toISOString(),
        duration: 45,
        messages: [
          { role: 'user', content: 'Olá, preciso de ajuda com meu pedido' },
          { role: 'assistant', content: 'Claro! Vou verificar seu pedido agora.' }
        ],
        analysis: {
          summary: 'Cliente solicitou ajuda com pedido. Atendimento iniciado com sucesso.'
        }
      }
    });

    console.log('\n\n🎉 TESTE COMPLETO!\n');
    console.log('📋 Verificações necessárias:');
    console.log('1. Execute: SELECT * FROM vapi_calls WHERE vapi_call_id = \'' + callId + '\';');
    console.log('2. Execute: SELECT * FROM vapi_transcripts WHERE call_id = (SELECT id FROM vapi_calls WHERE vapi_call_id = \'' + callId + '\');');
    console.log('\n✅ Você deve ver:');
    console.log('   - 1 registro em vapi_calls com status "completed"');
    console.log('   - 2 registros em vapi_transcripts (user + assistant)');

  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

testDatabaseIntegration();
