#!/bin/bash
set -e

echo "================================================"
echo "🚀 Script de Push para Novo Repositório GitHub"
echo "================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Passo 1: Remover locks do Git
echo -e "${YELLOW}[1/7] Removendo locks do Git...${NC}"
rm -f .git/index.lock .git/config.lock .git/HEAD.lock 2>/dev/null || true
rm -rf .git/rebase-merge 2>/dev/null || true
echo -e "${GREEN}✓ Locks removidos${NC}"
echo ""

# Passo 2: Abortar qualquer rebase em andamento
echo -e "${YELLOW}[2/7] Limpando estado do Git...${NC}"
git rebase --abort 2>/dev/null || true
git am --abort 2>/dev/null || true
echo -e "${GREEN}✓ Estado do Git limpo${NC}"
echo ""

# Passo 3: Remover repositório antigo e adicionar novo
echo -e "${YELLOW}[3/7] Configurando novo repositório...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/ag12x-gth/master-vendas-ai.git
echo -e "${GREEN}✓ Novo repositório configurado: master-vendas-ai${NC}"
git remote -v
echo ""

# Passo 4: Verificar arquivos sensíveis
echo -e "${YELLOW}[4/7] Verificando arquivos sensíveis (.env não será incluído)...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ Arquivo .env encontrado e será ignorado (.gitignore)${NC}"
fi
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓ .env está no .gitignore${NC}"
else
    echo -e "${RED}⚠ Adicionando .env ao .gitignore${NC}"
    echo ".env" >> .gitignore
fi
echo ""

# Passo 5: Criar branch limpa sem histórico
echo -e "${YELLOW}[5/7] Criando branch limpa sem histórico de secrets...${NC}"
git checkout --orphan new-main
echo -e "${GREEN}✓ Nova branch criada${NC}"
echo ""

# Passo 6: Adicionar arquivos e fazer commit
echo -e "${YELLOW}[6/7] Adicionando arquivos e fazendo commit...${NC}"
git add .
git commit -m "Initial commit: NextN WhatsApp Platform

- Plataforma de mensagens WhatsApp com Next.js
- Integração WhatsApp Business API via QR (Baileys)
- Gerenciamento de contatos e campanhas
- Multi-tenant com autenticação
- Domínio: iasvendas.ai
- Versão: v2.4.1"

echo -e "${GREEN}✓ Commit criado${NC}"
echo ""

# Renomear branch
git branch -D main 2>/dev/null || true
git branch -m main

# Passo 7: Push para GitHub
echo -e "${YELLOW}[7/7] Enviando para GitHub...${NC}"
if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN_NOVO" ]; then
    echo -e "${RED}❌ Token não encontrado. Usando push padrão (vai pedir senha)...${NC}"
    git push -u origin main --force
else
    echo -e "${GREEN}✓ Token encontrado. Fazendo push autenticado...${NC}"
    git push https://$GITHUB_PERSONAL_ACCESS_TOKEN_NOVO@github.com/ag12x-gth/master-vendas-ai.git main --force
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ SUCESSO! Código enviado para GitHub${NC}"
echo "================================================"
echo ""
echo "Repositório: https://github.com/ag12x-gth/master-vendas-ai"
echo ""
