// Script de testes automatizados para validar correções
const https = require('https');

const BASE_URL = 'https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev';
const EMAIL = 'diegomaninhu@gmail.com';
const PASSWORD = 'MasterIA2025!';

let authCookie = '';
let testResults = {
  login: { status: 'pending', details: '' },
  contactCreation: { status: 'pending', details: '' },
  campaignQuery: { status: 'pending', details: '' },
  templateQuery: { status: 'pending', details: '' },
  listsQuery: { status: 'pending', details: '' },
};

// Função auxiliar para fazer requisições
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Capturar cookies
        const cookies = res.headers['set-cookie'];
        if (cookies) {
          cookies.forEach(cookie => {
            if (cookie.includes('auth-token')) {
              authCookie = cookie.split(';')[0];
            }
          });
        }
        
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// TESTE 1: Login
async function testLogin() {
  console.log('\n📝 TESTE 1: Login no sistema');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });

    if (response.status === 200 && authCookie) {
      testResults.login.status = '✅ PASSOU';
      testResults.login.details = 'Login realizado com sucesso';
      console.log('✅ Login bem-sucedido');
      return true;
    } else {
      testResults.login.status = '❌ FALHOU';
      testResults.login.details = `Status: ${response.status}`;
      console.log(`❌ Login falhou: ${response.status}`);
      return false;
    }
  } catch (error) {
    testResults.login.status = '❌ ERRO';
    testResults.login.details = error.message;
    console.log(`❌ Erro no login: ${error.message}`);
    return false;
  }
}

// TESTE 2: Criação de contato (Erros #1/#2)
async function testContactCreation() {
  console.log('\n📝 TESTE 2: Criação de contato com campos opcionais vazios');
  
  const testContact = {
    name: 'Teste Automático',
    phone: '5511999887766',
    email: '',  // Campo opcional vazio (deve ser transformado em undefined)
    avatarUrl: '',  // Campo opcional vazio
    notes: '',  // Campo opcional vazio
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
  };

  try {
    const response = await makeRequest('POST', '/api/v1/contacts', testContact, {
      Cookie: authCookie,
    });

    if (response.status === 201) {
      testResults.contactCreation.status = '✅ PASSOU';
      testResults.contactCreation.details = `Contato criado: ID ${response.data.id || 'N/A'}`;
      console.log('✅ Contato criado com sucesso (strings vazias tratadas)');
      return response.data.id;
    } else {
      testResults.contactCreation.status = '❌ FALHOU';
      testResults.contactCreation.details = JSON.stringify(response.data);
      console.log(`❌ Falha na criação: ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    testResults.contactCreation.status = '❌ ERRO';
    testResults.contactCreation.details = error.message;
    console.log(`❌ Erro: ${error.message}`);
    return null;
  }
}

// TESTE 3: Query de campanhas (Erro #7 - Template Association)
async function testCampaignQuery() {
  console.log('\n📝 TESTE 3: Query de campanhas com templates');
  
  try {
    const response = await makeRequest('GET', '/api/v1/campaigns', null, {
      Cookie: authCookie,
    });

    if (response.status === 200) {
      const campaigns = response.data.data || [];
      const withTemplates = campaigns.filter(c => c.template);
      
      testResults.campaignQuery.status = '✅ PASSOU';
      testResults.campaignQuery.details = `${campaigns.length} campanhas, ${withTemplates.length} com templates`;
      console.log(`✅ ${campaigns.length} campanhas encontradas`);
      console.log(`✅ ${withTemplates.length} campanhas com templates válidos`);
      return true;
    } else {
      testResults.campaignQuery.status = '❌ FALHOU';
      testResults.campaignQuery.details = `Status: ${response.status}`;
      console.log(`❌ Falha na query: ${response.status}`);
      return false;
    }
  } catch (error) {
    testResults.campaignQuery.status = '❌ ERRO';
    testResults.campaignQuery.details = error.message;
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

// TESTE 4: Query de templates
async function testTemplateQuery() {
  console.log('\n📝 TESTE 4: Query de message_templates');
  
  try {
    const response = await makeRequest('GET', '/api/v1/message-templates', null, {
      Cookie: authCookie,
    });

    if (response.status === 200) {
      const templates = Array.isArray(response.data) ? response.data : [];
      testResults.templateQuery.status = '✅ PASSOU';
      testResults.templateQuery.details = `${templates.length} templates encontrados`;
      console.log(`✅ ${templates.length} templates encontrados`);
      return templates;
    } else {
      testResults.templateQuery.status = '❌ FALHOU';
      testResults.templateQuery.details = `Status: ${response.status}`;
      console.log(`❌ Falha: ${response.status}`);
      return [];
    }
  } catch (error) {
    testResults.templateQuery.status = '❌ ERRO';
    testResults.templateQuery.details = error.message;
    console.log(`❌ Erro: ${error.message}`);
    return [];
  }
}

// TESTE 5: Query de listas
async function testListsQuery() {
  console.log('\n📝 TESTE 5: Query de listas de contatos');
  
  try {
    const response = await makeRequest('GET', '/api/v1/lists', null, {
      Cookie: authCookie,
    });

    if (response.status === 200) {
      const lists = Array.isArray(response.data) ? response.data : [];
      testResults.listsQuery.status = '✅ PASSOU';
      testResults.listsQuery.details = `${lists.length} listas encontradas`;
      console.log(`✅ ${lists.length} listas encontradas`);
      return lists;
    } else {
      testResults.listsQuery.status = '❌ FALHOU';
      testResults.listsQuery.details = `Status: ${response.status}`;
      console.log(`❌ Falha: ${response.status}`);
      return [];
    }
  } catch (error) {
    testResults.listsQuery.status = '❌ ERRO';
    testResults.listsQuery.details = error.message;
    console.log(`❌ Erro: ${error.message}`);
    return [];
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 INICIANDO TESTES AUTOMATIZADOS DAS CORREÇÕES\n');
  console.log('=' .repeat(60));

  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ Login falhou - abortando testes');
    printResults();
    return;
  }

  await testContactCreation();
  await testCampaignQuery();
  await testTemplateQuery();
  await testListsQuery();

  console.log('\n' + '='.repeat(60));
  printResults();
}

function printResults() {
  console.log('\n📊 RESUMO DOS TESTES:\n');
  Object.entries(testResults).forEach(([test, result]) => {
    console.log(`${result.status} ${test}: ${result.details}`);
  });
  
  const passed = Object.values(testResults).filter(r => r.status.includes('✅')).length;
  const total = Object.keys(testResults).length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 RESULTADO FINAL: ${passed}/${total} testes passaram\n`);
}

runAllTests().catch(console.error);
