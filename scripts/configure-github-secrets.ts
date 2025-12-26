#!/usr/bin/env tsx
/**
 * Script para configurar automaticamente os secrets do GitHub Actions
 * Requisito: GitHub CLI instalado e autenticado (gh auth login)
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Carrega variáveis de ambiente
const envPath = join(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.error(`${colors.red}❌ Arquivo .env.local não encontrado!${colors.reset}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

// Configuração dos secrets necessários
const secrets = [
  {
    name: 'OPENROUTER_API_KEY',
    value: process.env.OPENROUTER_API_KEY,
    description: 'Chave da API do OpenRouter',
  },
  {
    name: 'OPENROUTER_SITE_URL',
    value: process.env.OPENROUTER_SITE_URL || 'https://master-vendas-ai.local',
    description: 'URL do site para requisições do OpenRouter',
  },
  {
    name: 'OPENROUTER_TITLE',
    value: process.env.OPENROUTER_TITLE || 'Master Vendas AI',
    description: 'Título para requisições do OpenRouter',
  },
];

// Função para executar comandos
function runCommand(command: string, silent = false): string {
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    return output.trim();
  } catch (error: any) {
    if (!silent) {
      console.error(`${colors.red}❌ Erro ao executar comando: ${command}${colors.reset}`);
      console.error(error.message);
    }
    return '';
  }
}

// Função principal
async function main() {
  console.log(`${colors.cyan}=== Configurador de Secrets do GitHub ===${colors.reset}\n`);

  // Verifica se o GitHub CLI está instalado
  console.log(`${colors.blue}📦 Verificando GitHub CLI...${colors.reset}`);
  const ghVersion = runCommand('gh --version', true);
  
  if (!ghVersion) {
    console.error(`${colors.red}❌ GitHub CLI não está instalado!${colors.reset}`);
    console.log(`${colors.yellow}📝 Por favor, instale o GitHub CLI:${colors.reset}`);
    console.log(`   - Windows: winget install GitHub.cli`);
    console.log(`   - Mac: brew install gh`);
    console.log(`   - Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ GitHub CLI encontrado: ${ghVersion.split('\n')[0]}${colors.reset}\n`);

  // Verifica autenticação
  console.log(`${colors.blue}🔐 Verificando autenticação do GitHub...${colors.reset}`);
  const authStatus = runCommand('gh auth status', true);
  
  if (!authStatus.includes('Logged in')) {
    console.error(`${colors.red}❌ Não autenticado no GitHub!${colors.reset}`);
    console.log(`${colors.yellow}📝 Execute: gh auth login${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Autenticado no GitHub${colors.reset}\n`);

  // Obtém informações do repositório
  console.log(`${colors.blue}📂 Detectando repositório...${colors.reset}`);
  const repoInfo = runCommand('gh repo view --json nameWithOwner', true);
  
  if (!repoInfo) {
    console.error(`${colors.red}❌ Não foi possível detectar o repositório!${colors.reset}`);
    console.log(`${colors.yellow}📝 Certifique-se de estar em um diretório Git com repositório remoto.${colors.reset}`);
    process.exit(1);
  }

  const { nameWithOwner } = JSON.parse(repoInfo);
  console.log(`${colors.green}✅ Repositório detectado: ${nameWithOwner}${colors.reset}\n`);

  // Configura cada secret
  console.log(`${colors.blue}🔧 Configurando secrets...${colors.reset}\n`);
  const timestamp = new Date().toISOString();
interface SecretResult {
  name: string;
  status: 'success' | 'error' | 'skipped';
  reason?: string;
  error?: string;
  timestamp?: string;
  value?: string;
}

const results: SecretResult[] = [];

  for (const secret of secrets) {
    if (!secret.value) {
      console.log(`${colors.yellow}⚠️  ${secret.name}: Valor não encontrado, pulando...${colors.reset}`);
      results.push({
        name: secret.name,
        status: 'skipped',
        reason: 'Valor não encontrado em .env.local',
      });
      continue;
    }

    console.log(`${colors.cyan}📝 Configurando ${secret.name}...${colors.reset}`);
    console.log(`   ${secret.description}`);
    console.log(`   Valor: ${secret.value.substring(0, 10)}...`);

    const result = spawnSync('gh', ['secret', 'set', secret.name, '-R', nameWithOwner], {
      input: secret.value,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status === 0) {
      console.log(`${colors.green}   ✅ Configurado com sucesso!${colors.reset}\n`);
      results.push({
        name: secret.name,
        status: 'success',
        timestamp,
        value: secret.value.substring(0, 10) + '...',
      });
    } else {
      console.log(`${colors.red}   ❌ Erro ao configurar!${colors.reset}\n`);
      results.push({
        name: secret.name,
        status: 'error',
        error: result.stderr.toString() || 'Unknown error',
      });
    }
  }

  // Relatório final
  console.log(`${colors.cyan}=== Relatório de Configuração ===${colors.reset}\n`);
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`📦 Repositório: ${nameWithOwner}`);
  console.log(`\n📊 Resultados:`);

  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⚠️' : '❌';
    console.log(`   ${icon} ${result.name}: ${result.status}`);
    if (result.reason) console.log(`      Razão: ${result.reason}`);
    if (result.error) console.log(`      Erro: ${result.error}`);
  }

  // Testa o workflow
  console.log(`\n${colors.blue}🧪 Testando workflow...${colors.reset}\n`);
  console.log('Você pode executar o workflow manualmente com:');
  console.log(`${colors.cyan}gh workflow run "Update OpenRouter Models" -R ${nameWithOwner}${colors.reset}`);
  
  // Salva log de evidência
  const logContent = {
    timestamp,
    repository: nameWithOwner,
    secrets: results,
    environment: {
      node: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    },
  };

  const logPath = join(process.cwd(), `logs/github-secrets-${Date.now()}.json`);
  const { writeFileSync, mkdirSync } = require('fs');
  mkdirSync('logs', { recursive: true });
  writeFileSync(logPath, JSON.stringify(logContent, null, 2));
  
  console.log(`\n${colors.green}📄 Log salvo em: ${logPath}${colors.reset}`);
  console.log(`\n${colors.green}🎉 Configuração concluída!${colors.reset}\n`);
}

// Executa o script
main().catch((error) => {
  console.error(`${colors.red}❌ Erro fatal:${colors.reset}`, error);
  process.exit(1);
});
