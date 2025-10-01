# Testes Automatizados - Ferramentas Internas

## 🚀 Scripts de Teste Diretos

### Setup Inicial
```typescript
// test-internal-tools.ts
import { internalTools } from '@/ai/tools/internal-tools';

const runTests = async () => {
  console.log('🧪 Iniciando testes das ferramentas internas...');
  
  // Seus testes aqui
};
```

---

## 1. **listContacts** - Teste Completo

```typescript
// Teste 1: Listagem básica
const testListContacts = async () => {
  console.log('\n📞 Testando listContacts...');
  
  try {
    // Teste básico
    const result1 = await internalTools.listContacts.execute({
      limit: 5,
      offset: 0
    });
    
    const data1 = JSON.parse(result1);
    assert(Array.isArray(data1.contacts), 'Deve retornar array de contatos');
    assert(data1.contacts.length <= 5, 'Deve respeitar limit');
    
    // Teste com busca
    const result2 = await internalTools.listContacts.execute({
      limit: 10,
      search: 'test'
    });
    
    const data2 = JSON.parse(result2);
    console.log('✅ listContacts: OK');
    
  } catch (error) {
    console.error('❌ listContacts: FALHOU', error);
  }
};
```

**Comando de Teste:**
```bash
npx tsx test-internal-tools.ts
```

---

## 2. **countContacts** - Teste Direto

```typescript
const testCountContacts = async () => {
  console.log('\n🔢 Testando countContacts...');
  
  try {
    const result = await internalTools.countContacts.execute({});
    const data = JSON.parse(result);
    
    assert(typeof data.total === 'number', 'Total deve ser número');
    assert(data.total >= 0, 'Total deve ser >= 0');
    
    console.log(`✅ countContacts: ${data.total} contatos`);
    
  } catch (error) {
    console.error('❌ countContacts: FALHOU', error);
  }
};
```

---

## 3. **listCampaigns** - Teste por Status

```typescript
const testListCampaigns = async () => {
  console.log('\n📢 Testando listCampaigns...');
  
  const statuses = ['draft', 'active', 'paused', 'completed'];
  
  for (const status of statuses) {
    try {
      const result = await internalTools.listCampaigns.execute({
        status: status as any,
        limit: 3
      });
      
      const data = JSON.parse(result);
      assert(Array.isArray(data.campaigns), `Deve retornar array para status ${status}`);
      
      // Verificar se todas têm o status correto
      data.campaigns.forEach((campaign: any) => {
        assert(campaign.status === status, `Campaign deve ter status ${status}`);
      });
      
      console.log(`✅ listCampaigns (${status}): ${data.campaigns.length} campanhas`);
      
    } catch (error) {
      console.error(`❌ listCampaigns (${status}): FALHOU`, error);
    }
  }
};
```

---

## 4. **listConversations** - Teste de Performance

```typescript
const testListConversations = async () => {
  console.log('\n💬 Testando listConversations...');
  
  try {
    const startTime = Date.now();
    
    const result = await internalTools.listConversations.execute({
      limit: 20,
      status: 'active'
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const data = JSON.parse(result);
    assert(Array.isArray(data.conversations), 'Deve retornar array');
    assert(duration < 2000, 'Deve responder em menos de 2s');
    
    console.log(`✅ listConversations: ${data.conversations.length} conversas (${duration}ms)`);
    
  } catch (error) {
    console.error('❌ listConversations: FALHOU', error);
  }
};
```

---

## 5. **calculator** - Teste Matemático

```typescript
const testCalculator = async () => {
  console.log('\n🧮 Testando calculator...');
  
  const tests = [
    { expr: '2 + 2', expected: 4 },
    { expr: '10 - 3', expected: 7 },
    { expr: '5 * 6', expected: 30 },
    { expr: '15 / 3', expected: 5 },
    { expr: '2 + 3 * 4', expected: 14 },
    { expr: '(2 + 3) * 4', expected: 20 },
    { expr: '1.5 + 2.5', expected: 4 }
  ];
  
  for (const test of tests) {
    try {
      const result = await internalTools.calculator.execute({
        expression: test.expr
      });
      
      const data = JSON.parse(result);
      assert(data.result === test.expected, 
        `${test.expr} deve ser ${test.expected}, got ${data.result}`);
      
      console.log(`✅ ${test.expr} = ${data.result}`);
      
    } catch (error) {
      console.error(`❌ ${test.expr}: FALHOU`, error);
    }
  }
  
  // Teste de erro
  try {
    await internalTools.calculator.execute({ expression: '1 / 0' });
    console.error('❌ Divisão por zero deveria falhar');
  } catch (error) {
    console.log('✅ Divisão por zero: erro tratado corretamente');
  }
};
```

---

## 6. **getCurrentDateTime** - Teste de Formato

```typescript
const testGetCurrentDateTime = async () => {
  console.log('\n⏰ Testando getCurrentDateTime...');
  
  try {
    const result = await internalTools.getCurrentDateTime.execute({});
    const data = JSON.parse(result);
    
    // Verificar formato ISO
    const date = new Date(data.currentDateTime);
    assert(!isNaN(date.getTime()), 'Deve ser data válida');
    
    // Verificar se é próximo do tempo atual (diferença < 5s)
    const now = new Date();
    const diff = Math.abs(now.getTime() - date.getTime());
    assert(diff < 5000, 'Deve ser próximo do tempo atual');
    
    console.log(`✅ getCurrentDateTime: ${data.currentDateTime}`);
    
  } catch (error) {
    console.error('❌ getCurrentDateTime: FALHOU', error);
  }
};
```

---

## 🔧 Script Completo de Teste

```typescript
// run-all-tests.ts
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const runAllTests = async () => {
  console.log('🚀 Executando todos os testes...');
  
  await testListContacts();
  await testCountContacts();
  await testListCampaigns();
  await testListConversations();
  await testCalculator();
  await testGetCurrentDateTime();
  
  console.log('\n🎉 Todos os testes concluídos!');
};

// Executar
runAllTests().catch(console.error);
```

---

## 📊 Teste de Carga

```typescript
const loadTest = async () => {
  console.log('\n⚡ Teste de carga...');
  
  const promises = [];
  const startTime = Date.now();
  
  // 10 requisições simultâneas
  for (let i = 0; i < 10; i++) {
    promises.push(
      internalTools.listContacts.execute({ limit: 5 })
    );
  }
  
  try {
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Carga: 10 requisições em ${duration}ms`);
    assert(duration < 5000, 'Deve processar 10 req em menos de 5s');
    
  } catch (error) {
    console.error('❌ Teste de carga: FALHOU', error);
  }
};
```

---

## 🎯 Comandos Rápidos

```bash
# Teste individual
npx tsx -e "import('./test-calculator.ts')"

# Teste completo
npx tsx run-all-tests.ts

# Teste de carga
npx tsx -e "import('./load-test.ts')"

# Teste com watch
npx tsx --watch run-all-tests.ts
```

---

## ✅ Critérios de Sucesso

- **Performance**: < 500ms por operação simples
- **Precisão**: 100% dos cálculos corretos
- **Consistência**: Dados sempre no formato esperado
- **Robustez**: Tratamento adequado de erros
- **Carga**: Suporta 10+ requisições simultâneas

---

**Execução:** `npm run test:internal-tools`  
**CI/CD:** Integrado no pipeline de deploy  
**Monitoramento:** Logs automáticos de performance