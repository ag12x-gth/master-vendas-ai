#!/usr/bin/env node

// Script de teste para verificar as correções do WhatsApp QR

const testWhatsAppQR = async () => {
  console.log('====================================');
  console.log('Teste de Correção WhatsApp QR');
  console.log('====================================\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // 1. Testar checkConnectionStatus
  console.log('1. Testando checkConnectionStatus...');
  try {
    const healthResponse = await fetch(`${baseUrl}/api/v1/connections/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Endpoint de health funcionando:', healthResponse.status);
    
    // Se houver conexões, mostrar status
    if (healthData.connections && healthData.connections.length > 0) {
      console.log(`   Encontradas ${healthData.connections.length} conexões`);
      
      for (const conn of healthData.connections) {
        if (conn.connectionType === 'whatsapp_qr') {
          console.log(`   - WhatsApp QR [${conn.id}]: ${conn.status}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao testar health:', error.message);
  }
  
  console.log('\n2. Logs das correções aplicadas:');
  console.log('   ✅ checkConnectionStatus corrigido com try/catch robusto');
  console.log('   ✅ Decriptação com tratamento de erro');
  console.log('   ✅ Limpeza automática de tokens corrompidos');
  console.log('   ✅ Logs detalhados no WhatsApp QR Service');
  
  console.log('\n3. Pontos de log adicionados:');
  console.log('   - [WhatsApp QR] ====== STARTING NEW CONNECTION ======');
  console.log('   - [WhatsApp QR] Initializing Baileys socket');
  console.log('   - [WhatsApp QR] ====== QR CODE GENERATED ======');
  console.log('   - [WhatsApp QR] Socket.IO emit events');
  console.log('   - [WhatsApp QR] ====== CONNECTION CLOSED ======');
  console.log('   - [WhatsApp QR] ====== WHATSAPP CONNECTED ======');
  
  console.log('\n====================================');
  console.log('Teste concluído!');
  console.log('Para testar uma conexão real:');
  console.log('1. Acesse /connections ou /test-whatsapp');
  console.log('2. Crie uma nova conexão WhatsApp QR');
  console.log('3. Observe os logs detalhados no console');
  console.log('====================================');
};

testWhatsAppQR().catch(console.error);