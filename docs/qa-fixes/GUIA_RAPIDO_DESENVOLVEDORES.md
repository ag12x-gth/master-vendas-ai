# 🚀 GUIA RÁPIDO PARA DESENVOLVEDORES - CORREÇÃO BUGS MASTER IA

**Última Atualização:** 07/11/2025  
**Versão:** 1.0  

---

## ⚡ INÍCIO RÁPIDO (5 MINUTOS)

### 1. 📥 Baixar Documentação
- ✅ `Relatorio_Forense_Master_IA_Diagnostico_Completo.docx` (relatório completo)
- ✅ `Planilha_Rastreamento_Bugs_Master_IA.xlsx` (tracking de bugs)
- ✅ `00_INDICE_DIAGNOSTICO_MASTER_IA.md` (índice navegável)

### 2. 🔍 Identificar Seu Bug
Acesse a planilha e veja qual bug foi atribuído a você. Se ainda não atribuído, escolha por prioridade:

**Prioridade 0 (URGENTE - Hoje):**
- BUG-C001: Botão Salvar Webhook
- BUG-C002: Dropdown Evento Gatilho  
- BUG-C003: Navegação

**Prioridade 1 (ALTA - 2-3 dias):**
- BUG-A001: Feedback Visual
- BUG-A002: Validação Formulários
- BUG-A003: IDs Semânticos

### 3. 📖 Ler Seção Específica do Bug
No relatório completo, localize a seção do seu bug e leia:
- Descrição detalhada
- Passos para reproduzir
- Sugestão de correção

---

## 🔥 BUGS CRÍTICOS - CORREÇÃO IMEDIATA

### 🐛 BUG-C001: Botão "Salvar Webhook" Não Responde

**Localização Provável:**
```bash
# Buscar arquivos relacionados a webhook
grep -r "webhook" --include="*.js" --include="*.jsx" --include="*.tsx"
grep -r "salvar\|save" --include="*.js" --include="*.jsx"
```

**Passos para Reproduzir:**
1. Login: diegomaninhu@gmail.com / MasterIA2025!
2. Navegar até módulo Webhooks
3. Preencher formulário
4. Clicar "Salvar"
5. **BUG:** Nada acontece

**Checklist de Correção:**
- [ ] Encontrar componente do formulário webhook
- [ ] Verificar se botão tem event listener registrado
- [ ] Implementar função de salvamento
- [ ] Adicionar validação de campos
- [ ] Adicionar feedback visual (loading spinner)
- [ ] Adicionar mensagens de sucesso/erro
- [ ] Testar salvamento real no backend
- [ ] Verificar redirecionamento após salvar

**Código Sugerido:**
```javascript
// Exemplo de implementação
const handleSaveWebhook = async (e) => {
    e.preventDefault();
    
    // 1. Validar campos
    if (!webhookName || !webhookUrl || !webhookEvent) {
        showError('Preencha todos os campos obrigatórios');
        return;
    }
    
    // 2. Mostrar loading
    setLoading(true);
    
    try {
        // 3. Fazer requisição
        const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: webhookName, url: webhookUrl, event: webhookEvent })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar');
        
        // 4. Sucesso
        showSuccess('Webhook salvo com sucesso!');
        redirectTo('/webhooks');
        
    } catch (error) {
        // 5. Erro
        showError('Erro ao salvar webhook. Tente novamente.');
        console.error(error);
    } finally {
        setLoading(false);
    }
};

// Registrar event listener
document.querySelector('#btn-salvar-webhook')?.addEventListener('click', handleSaveWebhook);
```

---

### 🐛 BUG-C002: Dropdown "Evento Gatilho" Sem Opções

**Localização Provável:**
```bash
# Buscar componente de dropdown
grep -r "Evento Gatilho\|evento\|event" --include="*.js" --include="*.jsx"
grep -r "select\|dropdown" --include="*.js" --include="*.jsx"
```

**Passos para Reproduzir:**
1. Abrir formulário de webhook
2. Clicar no dropdown "Evento Gatilho"
3. **BUG:** Dropdown vazio ou não abre

**Checklist de Correção:**
- [ ] Verificar endpoint `/api/webhook-events` existe
- [ ] Testar endpoint manualmente (Postman/curl)
- [ ] Verificar carregamento de opções no componente
- [ ] Implementar lista estática como fallback
- [ ] Adicionar loading state no dropdown
- [ ] Adicionar tratamento de erro se API falhar
- [ ] Testar seleção de opções

**Código Sugerido:**
```javascript
// Fallback com lista estática
const DEFAULT_EVENTS = [
    { id: 1, name: 'Quando um novo contato for criado' },
    { id: 2, name: 'Quando um lead for atualizado' },
    { id: 3, name: 'Quando uma venda for concluída' },
    { id: 4, name: 'Quando um email for enviado' }
];

// Carregar eventos
const loadEvents = async () => {
    try {
        const response = await fetch('/api/webhook-events');
        if (!response.ok) throw new Error('API Error');
        return await response.json();
    } catch (error) {
        console.warn('Usando eventos padrão (API indisponível)');
        return DEFAULT_EVENTS;
    }
};

// Usar no componente
useEffect(() => {
    loadEvents().then(setEvents);
}, []);
```

---

### 🐛 BUG-C003: Menu/Navegação Não Clicável

**Localização Provável:**
```bash
# Buscar componentes de navegação
grep -r "menu\|navbar\|sidebar" --include="*.js" --include="*.jsx"
grep -r "navigation\|nav" --include="*.js" --include="*.jsx"
```

**Passos para Reproduzir:**
1. Login no sistema
2. Tentar clicar em itens do menu
3. **BUG:** Alguns itens não respondem

**Checklist de Correção:**
- [ ] Identificar todos os itens de menu
- [ ] Testar cada item manualmente
- [ ] Verificar event listeners registrados
- [ ] Verificar rotas existem no sistema
- [ ] Corrigir links quebrados (#)
- [ ] Adicionar cursor pointer em itens clicáveis
- [ ] Testar navegação completa

**Código Sugerido:**
```javascript
// Verificar todos os links
const menuItems = document.querySelectorAll('.menu-item, .nav-link');
menuItems.forEach(item => {
    const href = item.getAttribute('href');
    if (!href || href === '#') {
        console.error('Link quebrado:', item.textContent);
    }
});

// Adicionar event listeners faltantes
menuItems.forEach(item => {
    if (!item.onclick && !item.getAttribute('href')) {
        console.warn('Item sem ação:', item.textContent);
        // Adicionar comportamento apropriado
    }
});
```

---

## 💡 DICAS IMPORTANTES

### ✅ ANTES DE COMEÇAR:

1. **Reproduzir o bug localmente**
   - Seguir exatamente os "Passos para Reproduzir"
   - Confirmar que você vê o mesmo problema

2. **Verificar console do navegador**
   - Abrir DevTools (F12)
   - Ver erros JavaScript
   - Capturar logs relevantes

3. **Limpar cache**
   - Ctrl + Shift + Delete
   - Ou usar modo anônimo

### ✅ DURANTE A CORREÇÃO:

1. **Criar branch específica**
   ```bash
   git checkout -b fix/bug-c001-salvar-webhook
   ```

2. **Fazer commits atômicos**
   ```bash
   git commit -m "fix(webhook): adiciona event listener ao botão salvar"
   git commit -m "fix(webhook): implementa validação de campos"
   git commit -m "fix(webhook): adiciona feedback visual"
   ```

3. **Testar continuamente**
   - Após cada pequena mudança
   - Verificar não quebrou nada

### ✅ DEPOIS DA CORREÇÃO:

1. **Validar usando checklist do relatório**
   - Seção "Checklist de Verificação Pós-Correção"

2. **Testar casos edge**
   - Campos vazios
   - Dados inválidos
   - Perda de conexão
   - Diferentes navegadores

3. **Atualizar planilha de tracking**
   - Mudar status para "Em Teste"
   - Adicionar observações

4. **Pull Request com evidências**
   - Descrição clara do que foi corrigido
   - Screenshots antes/depois
   - Vídeo demonstrando funcionalidade (opcional)

---

## 🛠️ COMANDOS ÚTEIS

### Buscar Arquivos:
```bash
# Buscar componente específico
find . -name "*webhook*" -type f
find . -name "*form*" -type f

# Buscar por texto no código
grep -r "texto_procurado" --include="*.js" --include="*.jsx"

# Buscar por função
grep -r "function salvar\|const salvar" --include="*.js"
```

### Testar API:
```bash
# Testar endpoint
curl -X GET https://[URL_DO_SISTEMA]/api/webhook-events

# Testar POST
curl -X POST https://[URL_DO_SISTEMA]/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","url":"https://test.com","event":"1"}'
```

### Git:
```bash
# Criar branch
git checkout -b fix/bug-id-descricao

# Commit
git add .
git commit -m "fix(componente): descrição breve"

# Push
git push origin fix/bug-id-descricao
```

---

## 📞 SUPORTE

**Dúvidas sobre bugs específicos:**
- Consultar relatório completo: `Relatorio_Forense_Master_IA_Diagnostico_Completo.docx`
- Seção específica do bug contém todos os detalhes

**Dúvidas técnicas:**
- Verificar logs no console
- Consultar documentação do framework usado
- Pedir ajuda ao time

**Bloqueios:**
- Reportar imediatamente ao tech lead
- Atualizar status na planilha
- Documentar o bloqueio

---

## ⏱️ ESTIMATIVAS DE TEMPO

| Bug ID | Complexidade | Tempo Estimado |
|--------|--------------|----------------|
| BUG-C001 | Média | 2-4 horas |
| BUG-C002 | Baixa-Média | 1-3 horas |
| BUG-C003 | Média-Alta | 3-5 horas |
| BUG-A001 | Alta | 4-6 horas |
| BUG-A002 | Alta | 4-8 horas |
| BUG-A003 | Média | 3-4 horas |

**Nota:** Tempos incluem: análise, implementação, testes e documentação.

---

## ✅ CHECKLIST GERAL

### Antes de Commitar:
- [ ] Bug reproduzido localmente
- [ ] Correção implementada
- [ ] Código testado manualmente
- [ ] Sem erros no console
- [ ] Sem warnings desnecessários
- [ ] Código formatado (linter)
- [ ] Comentários adicionados se necessário

### Antes do PR:
- [ ] Todos os testes passam
- [ ] Build funciona sem erros
- [ ] Checklist do relatório validado
- [ ] Screenshots/vídeos capturados
- [ ] Planilha atualizada
- [ ] Descrição do PR completa

### Após Merge:
- [ ] Deploy em staging
- [ ] Teste em staging
- [ ] QA validou correção
- [ ] Atualizar planilha (status: Resolvido)

---

## 🎯 FOCO IMEDIATO

**HOJE (próximas 8 horas):**

1. ⚡ **BUG-C001** - Botão Salvar Webhook (Prioridade MÁXIMA)
2. ⚡ **BUG-C002** - Dropdown Eventos (Prioridade MÁXIMA)
3. ⚡ **BUG-C003** - Navegação (Prioridade MÁXIMA)

**Objetivo:** Restaurar funcionalidades básicas do sistema.

---

**BOA CORREÇÃO! 💪**

*Se tiver dúvidas, consulte o relatório completo ou fale com o time.*