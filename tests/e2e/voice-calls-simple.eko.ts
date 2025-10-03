import { Eko, type LLMs, type EkoConfig } from '@eko-ai/eko';
import { BrowserAgent } from '@eko-ai/eko-nodejs';

async function runSimpleTest() {
  console.log('🧪 Teste Eko Simples - Validação de Dependências');
  
  const apiKey = process.env.OPENROUTERS_API_KEY;
  if (!apiKey) {
    throw new Error('❌ OPENROUTERS_API_KEY não configurado');
  }

  const llms: LLMs = {
    default: {
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      apiKey: apiKey,
      config: {
        baseURL: "https://openrouter.ai/api/v1",
        temperature: 0.5,
        maxTokens: 4000
      }
    }
  };

  const config: EkoConfig = {
    llms,
    agents: [new BrowserAgent()]
  };

  const eko = new Eko(config);

  try {
    console.log('\n✅ Iniciando teste simples (apenas login)...\n');

    const result = await eko.run(`
      Execute um teste simples:
      
      1. Navegue para http://localhost:5000/login
      2. Aguarde 2 segundos para página carregar
      3. Verifique se a página contém formulário de login
      4. Relate o que você vê (título, campos, botões)
      
      NÃO tente fazer login ainda, apenas observe a página.
    `);

    console.log('\n━'.repeat(60));
    console.log('✅ TESTE SIMPLES CONCLUÍDO!');
    console.log('━'.repeat(60));
    console.log('\n📊 RESULTADO:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error);
    throw error;
  }
}

runSimpleTest()
  .then(() => {
    console.log('\n✅ Execução finalizada com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Execução falhou:', error);
    process.exit(1);
  });
