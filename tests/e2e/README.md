# 🧪 E2E Tests - Voice Calls Vapi AI

## 📋 Visão Geral

Suite completa de testes End-to-End (E2E) para validar o sistema de Voice Calls com Vapi AI Integration.

**Objetivo:** Validar 100% das funcionalidades Voice Calls com dados reais (zero mocks).

**Tecnologias:**
- ✅ **Eko (Fellou.ai)** - IA autônoma com visão computacional (NOVO!)
- ✅ **Playwright** - Automação tradicional de testes
- PostgreSQL para seed de dados
- Next.js + TypeScript + React

**⚡ NOVO: Testes com IA Autônoma!**  
Agora você pode executar testes E2E usando **Eko by Fellou.ai** com Claude Sonnet 4.5 (thinking mode) via OpenRouter. Veja seção "Testes com Eko" abaixo.

---

## 📁 Estrutura de Arquivos

```
tests/e2e/
├── README.md                    # Este arquivo
├── EKO_MIGRATION_REPORT.md     # Relatório completo da migração Eko
├── seed-vapi-data.sql          # Script SQL para seed de dados
├── run-e2e-tests.sh            # Script automatizado Playwright
├── run-eko-tests.sh            # Script automatizado Eko (NOVO!)
├── voice-calls.spec.ts         # Suite de testes Playwright
├── voice-calls.eko.ts          # Suite de testes Eko (IA autônoma)
├── screenshots/                # Screenshots Playwright (gerados)
└── voice-calls-hybrid.test.ts  # Testes híbridos (API + SQL)
```

---

## 🤖 Testes com Eko (IA Autônoma) - NOVO!

### O que é Eko?

**Eko by Fellou.ai** é um framework de testes E2E que usa IA (Claude Sonnet 4.5) para:
- 👁️ **Visão computacional**: Entende UI como humano
- 🧠 **Planejamento autônomo**: Cria workflow de testes automaticamente
- 🗣️ **Linguagem natural**: Descreve testes em português
- 📸 **Screenshots inteligentes**: Captura evidências automaticamente
- 🔄 **Self-healing**: Adapta-se a mudanças na UI

**Vantagens vs Playwright:**
- ✅ 85% menos código (50 linhas vs 340)
- ✅ Testes em linguagem natural
- ✅ Visão computacional nativa
- ✅ Planejamento automático com 4 agentes paralelos

### Pré-requisitos Eko

1. **API Key OpenRouter configurada:**
   ```bash
   export OPENROUTERS_API_KEY="sk-or-v1-..."
   ```

2. **Dependências Linux (Ubuntu/Debian):**
   ```bash
   sudo npx playwright install-deps
   ```

   Ou manualmente:
   ```bash
   sudo apt-get install libglib2.0-0 libnspr4 libnss3 libdbus-1-3 \
     libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcb1 libxkbcommon0
   ```

3. **Servidor rodando:**
   ```bash
   npm run dev:server
   ```

### Executar Testes Eko

**Opção 1: Script Automatizado**
```bash
bash tests/e2e/run-eko-tests.sh
```

**Opção 2: Comando Direto**
```bash
npx tsx tests/e2e/voice-calls.eko.ts
```

### Exemplo de Output Eko

```
🤖 Iniciando execução autônoma com Eko...

[INFO] Planner result: 
<root>
  <name>Master IA Oficial E2E Testing</name>
  <agents>
    <agent name="Browser" id="0">
      <task>Execute login and navigate (Tests 01-02)</task>
    </agent>
    <agent name="Browser" id="1" dependsOn="0">
      <task>Validate KPIs and history (Tests 03-04)</task>
    </agent>
    <agent name="Browser" id="2" dependsOn="1">
      <task>Test filters and search (Tests 05-07)</task>
    </agent>
    <agent name="Browser" id="3" dependsOn="2">
      <task>Test modals and analytics (Tests 08-10)</task>
    </agent>
  </agents>
</root>

✅ EXECUÇÃO EKO CONCLUÍDA!
📊 10/10 testes passaram com visão computacional
📸 Screenshots: /tmp/e2e-eko-screenshots/
```

### Documentação Completa Eko

Para detalhes completos da migração, veja:  
📄 **[EKO_MIGRATION_REPORT.md](./EKO_MIGRATION_REPORT.md)**

---

## 🚀 Execução Rápida (Playwright)

### Pré-requisitos

1. **Servidor Next.js rodando:**
   ```bash
   npm run dev:server
   ```

2. **Banco de dados PostgreSQL configurado:**
   ```bash
   echo $DATABASE_URL  # Deve retornar a connection string
   ```

3. **Playwright instalado:**
   ```bash
   npx playwright install
   ```

### Executar Testes E2E

**Opção 1: Script Automatizado (Recomendado)**
```bash
chmod +x tests/e2e/run-e2e-tests.sh
./tests/e2e/run-e2e-tests.sh
```

**Opção 2: Passo a Passo Manual**

1. Executar seed de dados:
```bash
psql $DATABASE_URL -f tests/e2e/seed-vapi-data.sql
```

2. Executar testes Playwright:
```bash
npx playwright test tests/e2e/voice-calls.spec.ts
```

3. Ver relatório:
```bash
npx playwright show-report
```

---

## 📊 Dados de Teste

### Usuário E2E
```yaml
Email: teste.e2e@masteriaoficial.com
Password: Test@2025!E2E
Firebase UID: e2e-firebase-uid-001
Company ID: 52fef76d-459c-462d-834b-e6eade8f6adf
Role: admin
```

**Nota:** O seed SQL cria/atualiza automaticamente este usuário com todos os campos obrigatórios (firebase_uid, password hash, etc).

### Dados Seed (Criados automaticamente)

**5 Contatos:**
1. Maria Silva - +5511987654321
2. João Santos - +5521976543210
3. Ana Costa - +5531965432109
4. Pedro Oliveira - +5541954321098
5. Carla Souza - +5551943210987

**5 Chamadas Vapi:**
- 3 completed (120s, 85s, 240s)
- 1 in-progress
- 1 failed

**Métricas Esperadas:**
- Total de Chamadas: 5
- Taxa de Sucesso: 60%
- Duração Média: 148.33s
- Completed: 3

---

## 🧪 Testes Executados

### 10 Testes E2E

| # | Teste | Validação |
|---|-------|-----------|
| 01 | Login E2E | Autenticação via formulário |
| 02 | Navegação Voice Calls | Carregamento da página |
| 03 | KPI Dashboard | Métricas reais (5 calls, 60% success) |
| 04 | Call History Table | 5 registros exibidos |
| 05 | Filtro Status | Filtrar por "completed" → 3 resultados |
| 06 | Busca Nome | Buscar "Maria" → 1 resultado |
| 07 | Busca Telefone | Buscar "+5511" → 1 resultado |
| 08 | Modal Nova Campanha | Abrir e validar campos |
| 09 | Modal Detalhes | Abrir e validar informações |
| 10 | Tab Analytics | Confirmar "em desenvolvimento" |

---

## 📸 Screenshots

Após executar os testes, screenshots são salvos em:
- `/tmp/e2e-screenshots/` (durante execução)
- `tests/e2e/screenshots/` (permanente)

**Screenshots gerados:**
1. `01-login-page.png` - Página de login
2. `01-login-filled.png` - Formulário preenchido
3. `01-login-success.png` - Dashboard pós-login
4. `02-voice-calls-page.png` - Página Voice Calls
5. `03-kpi-dashboard.png` - KPI Cards
6. `04-call-history-table.png` - Tabela de histórico
7. `05-filter-completed.png` - Filtro aplicado
8. `06-search-maria.png` - Busca por nome
9. `07-search-phone.png` - Busca por telefone
10. `08-new-campaign-modal.png` - Modal nova campanha
11. `09-call-details-modal.png` - Modal detalhes
12. `10-analytics-tab.png` - Tab Analytics

---

## 🛠️ Configuração Playwright

**playwright.config.ts** (raiz do projeto):
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5000',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],
});
```

---

## 🐛 Troubleshooting

### Erro: "Servidor não está rodando"
```bash
# Inicie o servidor primeiro
npm run dev:server
```

### Erro: "DATABASE_URL não definido"
```bash
# Verifique as variáveis de ambiente
echo $DATABASE_URL
```

### Erro: "Playwright não instalado"
```bash
# Instale Playwright e browsers
npm install -D @playwright/test
npx playwright install
```

### Erro: "Seed falhou - duplicate key"
```bash
# Limpar dados antigos (CUIDADO: apaga dados de teste)
psql $DATABASE_URL -c "DELETE FROM vapi_calls WHERE company_id = '52fef76d-459c-462d-834b-e6eade8f6adf';"
psql $DATABASE_URL -c "DELETE FROM contacts WHERE company_id = '52fef76d-459c-462d-834b-e6eade8f6adf';"
```

---

## 📈 Resultados Esperados

**Todos os 10 testes devem passar:**
```
✅ 01 - Login com usuário E2E (PASSED)
✅ 02 - Navegar para Voice Calls (PASSED)
✅ 03 - Validar KPI Dashboard (PASSED)
✅ 04 - Validar Call History Table (PASSED)
✅ 05 - Filtrar por Status (PASSED)
✅ 06 - Buscar por nome (PASSED)
✅ 07 - Buscar por telefone (PASSED)
✅ 08 - Abrir Modal Nova Campanha (PASSED)
✅ 09 - Abrir Modal Detalhes (PASSED)
✅ 10 - Validar Tab Analytics (PASSED)

10 passed (XXs)
```

---

## 📄 Relatórios Gerados

Após execução, os seguintes relatórios são criados:

1. **Playwright HTML Report**
   - Localização: `playwright-report/index.html`
   - Comando: `npx playwright show-report`

2. **Screenshots**
   - Localização: `/tmp/e2e-screenshots/` + `tests/e2e/screenshots/`
   - Total: ~12 screenshots

3. **Test Metadata JSON**
   - Localização: `/tmp/e2e-screenshots/test-metadata.json`
   - Contém: timestamp, user, expected data, screenshot paths

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start server
        run: npm run dev:server &
      
      - name: Wait for server
        run: npx wait-on http://localhost:5000
      
      - name: Run E2E tests
        run: ./tests/e2e/run-e2e-tests.sh
      
      - name: Upload screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-screenshots
          path: tests/e2e/screenshots/
```

---

## 📚 Documentação Adicional

- [Playwright Documentation](https://playwright.dev/)
- [Master IA Oficial - Voice Calls Documentation](../../VOICE_CALLS_E2E_VALIDATION_REPORT.md)
- [Vapi AI API Docs](https://docs.vapi.ai/)

---

## 👥 Contribuindo

1. Faça fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feature/nova-funcionalidade`
3. Adicione testes E2E para suas mudanças
4. Execute os testes: `./tests/e2e/run-e2e-tests.sh`
5. Commit suas mudanças: `git commit -m 'feat: adicionar nova funcionalidade'`
6. Push para a branch: `git push origin feature/nova-funcionalidade`
7. Abra um Pull Request

---

## 📝 Licença

Master IA Oficial - Proprietary License
© 2025 Master IA Oficial Team
