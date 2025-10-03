import { Eko, type LLMs, type EkoConfig } from '@eko-ai/eko';
import { BrowserAgent } from '@eko-ai/eko-nodejs';
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

const SCREENSHOT_DIR = '/tmp/e2e-eko-screenshots';

async function runVoiceCallsE2ETests() {
  console.log('🚀 Iniciando testes E2E com Eko (Fellou.ai)');
  console.log('🎯 URL Base: http://localhost:5000');
  console.log('🤖 Modelo: Claude Sonnet 3.5 (fast mode) via OpenRouter');
  console.log('━'.repeat(60));

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Verificar se API key está disponível (OPENROUTERS_API_KEY com S)
  const apiKey = process.env.OPENROUTERS_API_KEY;
  if (!apiKey) {
    throw new Error('❌ OPENROUTERS_API_KEY não está configurado! Configure a secret no Replit.');
  }

  const llms: LLMs = {
    default: {
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      apiKey: apiKey,
      config: {
        baseURL: "https://openrouter.ai/api/v1",
        temperature: 0.7,
        maxTokens: 8000
      }
    }
  };

  const config: EkoConfig = {
    llms,
    agents: [new BrowserAgent()]
  };

  const eko = new Eko(config);

  try {
    console.log('\n📋 INICIANDO TESTES AUTÔNOMOS COM VISÃO COMPUTACIONAL\n');

    const fullTask = `
    Você é um testador autônomo de QA realizando testes E2E no sistema Master IA Oficial.
    Execute os seguintes 10 testes em sequência, validando cada um com visão computacional:

    **BASE URL:** http://localhost:5000

    **CREDENCIAIS DE TESTE:**
    - Email: ${TEST_USER.email}
    - Password: ${TEST_USER.password}

    **DADOS ESPERADOS:**
    - Total de Chamadas: ${EXPECTED_DATA.totalCalls}
    - Chamadas Completadas: ${EXPECTED_DATA.completedCalls}
    - Taxa de Sucesso: ${EXPECTED_DATA.successRate}%
    - Duração Média: ~${EXPECTED_DATA.avgDuration} segundos
    - Contatos: ${EXPECTED_DATA.contacts.join(', ')}

    ---

    **TESTE 01 - LOGIN COM AUTENTICAÇÃO REAL**
    1. Navegue para http://localhost:5000/login
    2. Localize o formulário de login (campos Email e Senha)
    3. Preencha email: ${TEST_USER.email}
    4. Preencha senha: ${TEST_USER.password}
    5. Clique no botão de login/entrar
    6. Aguarde redirecionamento para /dashboard
    7. Confirme que login foi bem-sucedido
    8. Capture screenshot: ${path.join(SCREENSHOT_DIR, '01-login-success.png')}
    
    Validação: Não deve haver mensagens de erro, página deve carregar completamente.

    ---

    **TESTE 02 - NAVEGAÇÃO PARA VOICE CALLS**
    1. No menu lateral (sidebar), localize "Voice Calls" ou "Chamadas de Voz"
    2. Clique no link
    3. Aguarde carregamento completo
    4. Confirme URL mudou para /voice-calls
    5. Capture screenshot: ${path.join(SCREENSHOT_DIR, '02-voice-calls-page.png')}
    
    Validação: Página deve mostrar KPIs e tabela de histórico, sem erros.

    ---

    **TESTE 03 - VALIDAR KPI DASHBOARD**
    1. Na página Voice Calls, localize os cards de KPI
    2. Use visão computacional para ler os valores numéricos:
       - Total de Chamadas (deve ser ${EXPECTED_DATA.totalCalls})
       - Chamadas Completadas (deve ser ${EXPECTED_DATA.completedCalls})
       - Taxa de Sucesso (deve ser ${EXPECTED_DATA.successRate}%)
       - Duração Média (aproximadamente ${EXPECTED_DATA.avgDuration}s)
    3. Capture screenshot: ${path.join(SCREENSHOT_DIR, '03-kpi-dashboard.png')}
    
    Validação: Todos os KPIs devem estar visíveis e com valores corretos (±5% tolerância).

    ---

    **TESTE 04 - VALIDAR CALL HISTORY TABLE**
    1. Localize a tabela de histórico de chamadas
    2. Conte o número de linhas (deve ter ${EXPECTED_DATA.totalCalls})
    3. Verifique colunas: Nome, Telefone, Status, Duração, Data
    4. Confirme presença dos seguintes nomes:
       ${EXPECTED_DATA.contacts.map(name => `- ${name}`).join('\n       ')}
    5. Capture screenshot: ${path.join(SCREENSHOT_DIR, '04-call-history-table.png')}
    
    Validação: Tabela completa, ${EXPECTED_DATA.totalCalls} registros, dados formatados.

    ---

    **TESTE 05 - FILTRO POR STATUS (COMPLETED)**
    1. Localize dropdown de status (topo da tabela)
    2. Clique para abrir
    3. Selecione "Completed" ou "Completadas"
    4. Aguarde filtragem
    5. Conte linhas visíveis (deve ser ${EXPECTED_DATA.completedCalls})
    6. Verifique que todas têm status "Completed"
    7. Capture screenshot: ${path.join(SCREENSHOT_DIR, '05-filter-completed.png')}
    
    Validação: Apenas ${EXPECTED_DATA.completedCalls} chamadas completadas exibidas.

    ---

    **TESTE 06 - BUSCA POR NOME**
    1. Localize campo de busca/search
    2. Digite: "Maria"
    3. Aguarde filtro em tempo real
    4. Confirme que apenas 1 resultado aparece
    5. Verifique resultado é "Maria Silva"
    6. Limpe busca e confirme todos retornam
    7. Capture screenshot: ${path.join(SCREENSHOT_DIR, '06-search-maria.png')}
    
    Validação: Busca case-insensitive, filtra em tempo real.

    ---

    **TESTE 07 - BUSCA POR TELEFONE**
    1. No campo de busca, digite: "+5511"
    2. Aguarde filtragem
    3. Confirme pelo menos 1 resultado
    4. Verifique telefone(s) começam com +5511
    5. Capture screenshot: ${path.join(SCREENSHOT_DIR, '07-search-phone.png')}
    
    Validação: Busca funciona com números e símbolos.

    ---

    **TESTE 08 - MODAL NOVA CAMPANHA**
    1. Localize botão "Nova Campanha" ou "Bulk Campaign"
    2. Clique no botão
    3. Aguarde modal abrir
    4. Verifique componentes:
       - Título "Nova Campanha de Chamadas"
       - Campo seleção de contatos
       - Botões "Cancelar" e "Iniciar"
    5. Clique em "Cancelar" para fechar
    6. Capture screenshot: ${path.join(SCREENSHOT_DIR, '08-bulk-campaign-modal.png')}
    
    Validação: Modal abre, todos campos visíveis, pode fechar.

    ---

    **TESTE 09 - MODAL DETALHES DA CHAMADA**
    1. Na tabela, localize primeira chamada "Completed"
    2. Clique na linha ou botão "Ver Detalhes"
    3. Aguarde modal de detalhes
    4. Verifique informações:
       - Nome, Telefone, Status, Duração, Data
       - Resumo da chamada
       - Transcrição (se disponível)
    5. Feche modal
    6. Capture screenshot: ${path.join(SCREENSHOT_DIR, '09-call-details-modal.png')}
    
    Validação: Modal mostra todos dados, transcrição legível.

    ---

    **TESTE 10 - TAB ANALYTICS**
    1. Localize tabs no topo da página Voice Calls
    2. Identifique "History" e "Analytics"
    3. Clique em "Analytics"
    4. Aguarde conteúdo carregar
    5. Verifique gráficos/métricas ou mensagem "Em desenvolvimento"
    6. Capture screenshot: ${path.join(SCREENSHOT_DIR, '10-analytics-tab.png')}
    
    Validação: Tab clicável, conteúdo muda, sem erros.

    ---

    **APÓS TODOS OS TESTES:**
    - Liste resultados de cada teste (PASSOU/FALHOU)
    - Reporte bugs encontrados
    - Confirme que todas as screenshots foram salvas em ${SCREENSHOT_DIR}
    - Forneça resumo executivo final

    **IMPORTANTE:**
    - Use visão computacional para validar elementos visuais
    - Aguarde carregamento completo antes de validar
    - Capture screenshots em cada etapa
    - Reporte qualquer inconsistência nos dados
    - Valide que métricas correspondem aos valores esperados
    `;

    console.log('🤖 Iniciando execução autônoma com Eko...\n');
    
    const result = await eko.run(fullTask);

    console.log('\n' + '━'.repeat(60));
    console.log('✅ EXECUÇÃO EKO CONCLUÍDA!');
    console.log('━'.repeat(60));
    console.log('\n📊 RESULTADO DA EXECUÇÃO:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n📸 Screenshots salvos em:', SCREENSHOT_DIR);
    console.log('🎉 Testes E2E com visão computacional finalizados!\n');

    return result;

  } catch (error) {
    console.error('\n❌ ERRO durante execução dos testes Eko:');
    console.error(error);
    throw error;
  }
}

if (require.main === module) {
  runVoiceCallsE2ETests()
    .then(() => {
      console.log('✅ Pipeline E2E Eko concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Pipeline E2E Eko falhou:', error);
      process.exit(1);
    });
}

export { runVoiceCallsE2ETests };
