/**
 * HYBRID E2E TEST - Voice Calls
 * Combinação de API tests + Screenshots manuais para validação completa
 */

import * as fs from 'fs';
import * as path from 'path';

const TEST_USER = {
  email: 'teste.e2e@masteriaoficial.com',
  password: 'Test@2025!E2E',
  companyId: '52fef76d-459c-462d-834b-e6eade8f6adf',
  role: 'admin'
};

const EXPECTED_DATA = {
  totalCalls: 5,
  completedCalls: 3,
  avgDuration: 148,
  successRate: 60,
  contacts: ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Oliveira', 'Carla Souza']
};

const BASE_URL = 'http://localhost:5000';
const SCREENSHOT_DIR = '/tmp/e2e-screenshots';

interface TestResult {
  testName: string;
  status: 'passed' | 'failed';
  message: string;
  duration: number;
  screenshot?: string;
  data?: any;
}

const results: TestResult[] = [];

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return { response, data: await response.json() };
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    console.log(`\n🧪 Executando: ${name}`);
    await testFn();
    const duration = Date.now() - start;
    results.push({
      testName: name,
      status: 'passed',
      message: 'Teste passou com sucesso',
      duration
    });
    console.log(`✅ PASSOU (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      testName: name,
      status: 'failed',
      message,
      duration
    });
    console.log(`❌ FALHOU: ${message} (${duration}ms)`);
  }
}

async function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

async function assertGreaterThanOrEqual(actual: number, expected: number, message?: string) {
  if (actual < expected) {
    throw new Error(message || `Expected ${actual} to be >= ${expected}`);
  }
}

async function assertContains(text: string, substring: string, message?: string) {
  if (!text.toLowerCase().includes(substring.toLowerCase())) {
    throw new Error(message || `Expected "${text}" to contain "${substring}"`);
  }
}

// ============= TESTES =============

async function test01_Login() {
  const { response, data } = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  await assertEquals(response.status, 200, 'Login deve retornar 200');
  await assertEquals(data.success, true, 'Login deve ter success=true');
  
  console.log(`   ✓ Usuário logado: ${data.user?.email || TEST_USER.email}`);
}

async function test02_VapiMetrics() {
  const { response, data } = await apiCall('/api/vapi/metrics');
  
  await assertEquals(response.status, 200, 'Vapi metrics deve retornar 200');
  
  const summary = data.summary;
  await assertEquals(summary.totalCalls, EXPECTED_DATA.totalCalls, 
    `Total de chamadas deve ser ${EXPECTED_DATA.totalCalls}`);
  await assertEquals(summary.completedCalls, EXPECTED_DATA.completedCalls,
    `Chamadas completadas deve ser ${EXPECTED_DATA.completedCalls}`);
  await assertEquals(summary.avgDuration, EXPECTED_DATA.avgDuration,
    `Duração média deve ser ${EXPECTED_DATA.avgDuration}s`);
  await assertEquals(summary.successRate, EXPECTED_DATA.successRate,
    `Taxa de sucesso deve ser ${EXPECTED_DATA.successRate}%`);
  
  console.log(`   ✓ Total: ${summary.totalCalls} chamadas`);
  console.log(`   ✓ Completadas: ${summary.completedCalls}`);
  console.log(`   ✓ Duração média: ${summary.avgDuration}s`);
  console.log(`   ✓ Taxa de sucesso: ${summary.successRate}%`);
  
  results[results.length - 1].data = summary;
}

async function test03_CallHistory() {
  const { response, data } = await apiCall('/api/vapi/history?page=1&limit=10');
  
  await assertEquals(response.status, 200, 'Call history deve retornar 200');
  
  const calls = data.calls || [];
  await assertGreaterThanOrEqual(calls.length, EXPECTED_DATA.totalCalls,
    `Deve ter pelo menos ${EXPECTED_DATA.totalCalls} chamadas`);
  
  console.log(`   ✓ ${calls.length} chamadas encontradas`);
  
  calls.forEach((call: any, index: number) => {
    if (index < 3) {
      console.log(`   ✓ ${call.customerName} - ${call.status} - ${call.duration || 0}s`);
    }
  });
  
  results[results.length - 1].data = { callsCount: calls.length, firstCall: calls[0] };
}

async function test04_FilterCompleted() {
  const { response, data } = await apiCall('/api/vapi/history?status=completed');
  
  await assertEquals(response.status, 200, 'Filtro completed deve retornar 200');
  
  const completedCalls = data.calls || [];
  await assertEquals(completedCalls.length, EXPECTED_DATA.completedCalls,
    `Deve ter ${EXPECTED_DATA.completedCalls} chamadas completed`);
  
  completedCalls.forEach((call: any) => {
    if (call.status !== 'completed') {
      throw new Error(`Chamada ${call.id} tem status ${call.status}, esperado: completed`);
    }
  });
  
  console.log(`   ✓ ${completedCalls.length} chamadas com status completed`);
  results[results.length - 1].data = { completedCount: completedCalls.length };
}

async function test05_SearchMaria() {
  const { response, data } = await apiCall('/api/vapi/history?search=Maria');
  
  await assertEquals(response.status, 200, 'Busca deve retornar 200');
  
  const mariaCalls = data.calls || [];
  await assertGreaterThanOrEqual(mariaCalls.length, 1, 'Deve encontrar pelo menos 1 chamada para Maria');
  
  const firstCall = mariaCalls[0];
  await assertContains(firstCall.customerName, 'Maria', 'Nome deve conter "Maria"');
  
  console.log(`   ✓ ${mariaCalls.length} resultado(s) para "Maria"`);
  console.log(`   ✓ Primeiro: ${firstCall.customerName}`);
  
  results[results.length - 1].data = { searchResults: mariaCalls.length, firstName: firstCall.customerName };
}

async function test06_SearchPhone() {
  const { response, data } = await apiCall('/api/vapi/history?search=%2B5511');
  
  await assertEquals(response.status, 200, 'Busca por telefone deve retornar 200');
  
  const phoneCalls = data.calls || [];
  await assertGreaterThanOrEqual(phoneCalls.length, 1, 'Deve encontrar pelo menos 1 chamada com +5511');
  
  console.log(`   ✓ ${phoneCalls.length} resultado(s) para "+5511"`);
  if (phoneCalls[0]) {
    console.log(`   ✓ Telefone: ${phoneCalls[0].customerNumber}`);
  }
  
  results[results.length - 1].data = { phoneResults: phoneCalls.length };
}

async function test07_Pagination() {
  const { response, data } = await apiCall('/api/vapi/history?page=1&limit=3');
  
  await assertEquals(response.status, 200, 'Paginação deve retornar 200');
  
  const pagination = data.pagination;
  await assertEquals(pagination.page, 1, 'Página deve ser 1');
  await assertEquals(pagination.limit, 3, 'Limit deve ser 3');
  await assertGreaterThanOrEqual(pagination.totalCount, EXPECTED_DATA.totalCalls,
    'Total count deve ser >= 5');
  
  console.log(`   ✓ Página: ${pagination.page}/${pagination.totalPages}`);
  console.log(`   ✓ Total: ${pagination.totalCount} chamadas`);
  console.log(`   ✓ Limit: ${pagination.limit}`);
  
  results[results.length - 1].data = pagination;
}

async function test08_CallStatuses() {
  const statuses = ['completed', 'in-progress', 'failed'];
  const statusCounts: any = {};
  
  for (const status of statuses) {
    const { data } = await apiCall(`/api/vapi/history?status=${status}`);
    const count = data.calls?.length || 0;
    statusCounts[status] = count;
    console.log(`   ✓ Status ${status}: ${count} chamadas`);
  }
  
  await assertGreaterThanOrEqual(statusCounts.completed, 1, 'Deve ter chamadas completed');
  
  results[results.length - 1].data = statusCounts;
}

// ============= EXECUÇÃO =============

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VOICE CALLS E2E - TESTES HÍBRIDOS (API + Screenshots)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔑 Usuário: ${TEST_USER.email}`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const startTime = Date.now();

  await runTest('01 - Login com usuário E2E', test01_Login);
  await runTest('02 - Validar métricas Vapi (KPIs)', test02_VapiMetrics);
  await runTest('03 - Buscar histórico de chamadas', test03_CallHistory);
  await runTest('04 - Filtrar chamadas completed', test04_FilterCompleted);
  await runTest('05 - Buscar por nome "Maria"', test05_SearchMaria);
  await runTest('06 - Buscar por telefone "+5511"', test06_SearchPhone);
  await runTest('07 - Testar paginação', test07_Pagination);
  await runTest('08 - Validar todos os status', test08_CallStatuses);

  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                     RESUMO DOS TESTES                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Testes Passados: ${passed}`);
  console.log(`❌ Testes Falhados: ${failed}`);
  console.log(`⏱️  Tempo Total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
  console.log(`📊 Taxa de Sucesso: ${((passed / results.length) * 100).toFixed(1)}%`);

  const report = {
    timestamp: new Date().toISOString(),
    testUser: TEST_USER.email,
    expectedData: EXPECTED_DATA,
    summary: {
      total: results.length,
      passed,
      failed,
      totalTime,
      successRate: (passed / results.length) * 100
    },
    results,
    screenshots: []
  };

  const reportPath = path.join(SCREENSHOT_DIR, 'e2e-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Relatório JSON salvo: ${reportPath}`);
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              PRÓXIMOS PASSOS PARA SCREENSHOTS UI           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📸 Use o screenshot tool para validar:');
  console.log('   1. /login - Formulário de login');
  console.log('   2. /voice-calls - Página principal com KPIs');
  console.log('   3. Modal Nova Campanha');
  console.log('   4. Modal Detalhes da Chamada');
  console.log('   5. Tab Analytics');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
