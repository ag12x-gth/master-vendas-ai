#!/usr/bin/env node

/**
 * Teste Completo WhatsApp QR Code
 * =================================
 * Script para validar conexão WhatsApp via QR Code
 */

const io = require('socket.io-client');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:5000';
const CONNECTION_ID = 'bf9bdff3-fefa-4ac4-b981-3dc795cc0387';
const COMPANY_ID = 'test-company-id';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const typeColors = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    debug: colors.cyan,
  };
  const color = typeColors[type] || colors.reset;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Teste 1: Verificar servidor está rodando
async function testServerRunning() {
  log('=== TESTE 1: Verificar servidor ===', 'info');
  
  try {
    const response = await fetch(`${BASE_URL}/test-whatsapp`);
    if (response.ok) {
      log('✅ Servidor rodando e página /test-whatsapp acessível', 'success');
      return true;
    } else {
      log(`❌ Página retornou status ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao acessar servidor: ${error.message}`, 'error');
    return false;
  }
}

// Teste 2: Testar conexão Socket.IO
async function testSocketConnection() {
  log('=== TESTE 2: Conexão Socket.IO ===', 'info');
  
  return new Promise((resolve) => {
    // Criar token simples para teste
    const testToken = Buffer.from(JSON.stringify({
      userId: 'test-user',
      companyId: COMPANY_ID,
      email: 'test@example.com'
    })).toString('base64');
    
    const socket = io(BASE_URL, {
      auth: { token: testToken },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 10000,
    });

    let connectionEstablished = false;
    let qrReceived = false;
    let testResult = { success: false, qrCode: null, events: [] };

    // Timeout para o teste
    const testTimeout = setTimeout(() => {
      log('⏱️ Timeout de 15 segundos atingido', 'warning');
      socket.disconnect();
      resolve(testResult);
    }, 15000);

    socket.on('connect', () => {
      connectionEstablished = true;
      log(`✅ Socket conectado: ${socket.id}`, 'success');
      testResult.events.push('connect');
      
      // Enviar comando de conexão WhatsApp
      log('📤 Enviando comando whatsapp:connect', 'info');
      socket.emit('whatsapp:connect', { connectionId: CONNECTION_ID });
    });

    socket.on('connect_error', (error) => {
      log(`❌ Erro de conexão Socket: ${error.message}`, 'error');
      testResult.events.push(`connect_error: ${error.message}`);
    });

    // Ouvir QR code
    socket.on('whatsapp:qr', (data) => {
      log('📱 QR Code recebido (evento genérico)', 'success');
      if (data.qrCode) {
        qrReceived = true;
        testResult.qrCode = data.qrCode.substring(0, 50) + '...';
        testResult.events.push('whatsapp:qr');
        log(`✅ QR Code válido recebido (tamanho: ${data.qrCode.length} caracteres)`, 'success');
      }
    });

    socket.on(`whatsapp:qr:${CONNECTION_ID}`, (data) => {
      log('📱 QR Code recebido (evento específico)', 'success');
      if (data.qrCode) {
        qrReceived = true;
        testResult.qrCode = data.qrCode.substring(0, 50) + '...';
        testResult.events.push(`whatsapp:qr:${CONNECTION_ID}`);
        log(`✅ QR Code específico válido (tamanho: ${data.qrCode.length} caracteres)`, 'success');
      }
    });

    socket.on('whatsapp:connecting', (data) => {
      log('🔄 WhatsApp conectando...', 'info');
      testResult.events.push('whatsapp:connecting');
    });

    socket.on('whatsapp:error', (data) => {
      log(`❌ Erro WhatsApp: ${data.error}`, 'error');
      testResult.events.push(`whatsapp:error: ${data.error}`);
    });

    // Capturar todos os eventos
    socket.onAny((event, ...args) => {
      log(`📥 Evento recebido: ${event}`, 'debug');
      if (event.startsWith('whatsapp:')) {
        testResult.events.push(event);
      }
    });

    // Verificar resultado após 10 segundos
    setTimeout(() => {
      if (connectionEstablished && qrReceived) {
        testResult.success = true;
        log('✅ TESTE SOCKET.IO COMPLETO COM SUCESSO', 'success');
      } else if (connectionEstablished) {
        log('⚠️ Socket conectado mas QR não recebido', 'warning');
      } else {
        log('❌ Falha na conexão Socket.IO', 'error');
      }
      
      clearTimeout(testTimeout);
      socket.disconnect();
      resolve(testResult);
    }, 10000);
  });
}

// Teste 3: Testar API diretamente (sem auth)
async function testDirectAPI() {
  log('=== TESTE 3: API WhatsApp QR ===', 'info');
  
  // Primeiro, vamos inicializar o serviço diretamente
  try {
    // Importar o serviço
    const WhatsAppQRService = require('./src/lib/services/whatsapp-qr.service.ts').default;
    const service = WhatsAppQRService.getInstance();
    
    log('📡 Iniciando conexão WhatsApp via service...', 'info');
    
    // Iniciar conexão
    await service.connectSession(CONNECTION_ID, COMPANY_ID);
    
    // Aguardar um pouco para ver se gera QR
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verificar status
    const status = await service.getStatus(CONNECTION_ID);
    log(`📊 Status: ${JSON.stringify(status)}`, 'info');
    
    if (status.isActive) {
      log('✅ WhatsApp conectado com sucesso', 'success');
      return { success: true, status };
    } else if (status.qrCode) {
      log('✅ QR Code gerado com sucesso', 'success');
      return { success: true, qrCode: true };
    } else {
      log('⚠️ Serviço iniciado mas aguardando QR', 'warning');
      return { success: false, status };
    }
  } catch (error) {
    log(`❌ Erro ao testar API: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

// Teste 4: Verificar logs e performance
async function testPerformanceAndLogs() {
  log('=== TESTE 4: Performance e Logs ===', 'info');
  
  const startTime = Date.now();
  const metrics = {
    serverResponseTime: 0,
    socketConnectionTime: 0,
    qrGenerationTime: 0,
  };
  
  // Testar tempo de resposta do servidor
  const serverStart = Date.now();
  const serverOk = await testServerRunning();
  metrics.serverResponseTime = Date.now() - serverStart;
  
  if (serverOk) {
    log(`⏱️ Tempo de resposta do servidor: ${metrics.serverResponseTime}ms`, 'info');
    
    // Testar tempo de conexão Socket.IO
    const socketStart = Date.now();
    const socketResult = await testSocketConnection();
    metrics.socketConnectionTime = Date.now() - socketStart;
    
    log(`⏱️ Tempo total Socket.IO: ${metrics.socketConnectionTime}ms`, 'info');
    
    if (socketResult.qrCode) {
      metrics.qrGenerationTime = metrics.socketConnectionTime; // Aproximado
      log(`⏱️ QR gerado em: ~${metrics.qrGenerationTime}ms`, 'info');
    }
  }
  
  const totalTime = Date.now() - startTime;
  log(`⏱️ Tempo total dos testes: ${totalTime}ms`, 'info');
  
  return metrics;
}

// Executar todos os testes
async function runAllTests() {
  console.log('\n');
  log('🚀 INICIANDO TESTE COMPLETO WHATSAPP QR CODE', 'success');
  log('============================================', 'success');
  console.log('\n');
  
  const results = {
    serverTest: false,
    socketTest: null,
    apiTest: null,
    performance: null,
  };
  
  // Teste 1: Servidor
  results.serverTest = await testServerRunning();
  console.log('\n');
  
  if (!results.serverTest) {
    log('❌ Servidor não está rodando. Abortando testes.', 'error');
    return results;
  }
  
  // Teste 2: Socket.IO
  results.socketTest = await testSocketConnection();
  console.log('\n');
  
  // Teste 3: API Direta
  results.apiTest = await testDirectAPI();
  console.log('\n');
  
  // Teste 4: Performance
  results.performance = await testPerformanceAndLogs();
  console.log('\n');
  
  // Relatório Final
  log('📊 RELATÓRIO FINAL', 'success');
  log('==================', 'success');
  
  console.log('\n🔍 Resultados dos Testes:');
  console.log('------------------------');
  console.log(`✓ Servidor: ${results.serverTest ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`✓ Socket.IO: ${results.socketTest?.success ? '✅ OK' : '⚠️ PARCIAL'}`);
  console.log(`✓ API WhatsApp: ${results.apiTest?.success ? '✅ OK' : '⚠️ PARCIAL'}`);
  
  console.log('\n📱 Eventos Socket.IO capturados:');
  if (results.socketTest?.events) {
    results.socketTest.events.forEach(event => {
      console.log(`  - ${event}`);
    });
  }
  
  console.log('\n⚡ Métricas de Performance:');
  if (results.performance) {
    console.log(`  - Resposta servidor: ${results.performance.serverResponseTime}ms`);
    console.log(`  - Conexão Socket.IO: ${results.performance.socketConnectionTime}ms`);
    console.log(`  - Geração QR Code: ${results.performance.qrGenerationTime}ms`);
  }
  
  console.log('\n💡 Recomendações:');
  if (!results.socketTest?.success || !results.socketTest?.qrCode) {
    console.log('  ⚠️ QR Code não foi recebido via Socket.IO');
    console.log('  → Verificar se o WhatsAppQRService está emitindo eventos corretamente');
    console.log('  → Verificar se Socket.IO está inicializado no servidor');
    console.log('  → Verificar autenticação do Socket.IO');
  }
  
  if (!results.apiTest?.success) {
    console.log('  ⚠️ API WhatsApp não funcionou completamente');
    console.log('  → Verificar dependências do Baileys');
    console.log('  → Verificar permissões de arquivo para sessions');
    console.log('  → Verificar logs do servidor para erros');
  }
  
  const allTestsPassed = results.serverTest && 
                        results.socketTest?.success && 
                        results.apiTest?.success;
  
  console.log('\n');
  if (allTestsPassed) {
    log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO!', 'success');
  } else {
    log('⚠️ ALGUNS TESTES FALHARAM - VERIFICAR RECOMENDAÇÕES', 'warning');
  }
  
  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests()
    .then((results) => {
      process.exit(results.serverTest ? 0 : 1);
    })
    .catch((error) => {
      log(`❌ Erro fatal: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTests };