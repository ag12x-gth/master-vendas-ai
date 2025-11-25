# 🤖 INSTRUÇÕES PARA REPLIT AGENT3 - CORREÇÃO MASTER IA

**Sistema:** Master IA  
**URL:** https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/login  
**Credenciais:** diegomaninhu@gmail.com / MasterIA2025!  
**Data:** 07/11/2025  

---

## 🎯 CONTEXTO GERAL

Sistema Master IA apresenta **12+ bugs críticos** com **taxa de falha de 66.7%**. Módulo de Webhooks está **completamente não funcional**. Sua missão é executar correções sistemáticas em **3 fases** conforme priorização.

---

## 📋 FASE 1: CORREÇÕES CRÍTICAS (EXECUTAR PRIMEIRO)

### Objetivo: Restaurar funcionalidades básicas do sistema
### Prazo: 1 dia
### Bugs: BUG-C001, BUG-C002, BUG-C003

---

### 🔧 TAREFA 1.1: Corrigir Botão "Salvar Webhook" (BUG-C001)

**Análise Inicial:**
```bash
# 1. Localizar arquivos do módulo webhook
find . -type f -name "*webhook*" 2>/dev/null

# 2. Buscar código do formulário
grep -rn "webhook.*form\|form.*webhook" --include="*.js" --include="*.jsx" --include="*.tsx" --include="*.vue"

# 3. Buscar botão salvar
grep -rn "salvar\|save.*webhook\|submit" --include="*.js" --include="*.jsx" --include="*.tsx" --include="*.vue"
```

**Reprodução do Bug:**
```
PASSOS:
1. Acessar: https://[URL]/login
2. Login com: diegomaninhu@gmail.com / MasterIA2025!
3. Navegar para módulo "Webhooks"
4. Clicar "Criar Novo Webhook"
5. Preencher:
   - Nome: "Teste Agent3"
   - URL: "https://webhook.site/test"
   - Evento: "Quando um novo contato for criado"
6. Clicar "Salvar"
7. OBSERVAR: Botão não responde

RESULTADO ESPERADO: Webhook salvo, mensagem de sucesso, redirecionamento
RESULTADO ATUAL: Nenhuma ação observada
```

**Implementação da Correção:**

```javascript
// ARQUIVO: [identificar após busca] - Ex: src/components/WebhookForm.jsx

// PASSO 1: Adicionar event listener ao botão
const btnSalvar = document.querySelector('#btn-salvar-webhook') || 
                  document.querySelector('[data-action="salvar-webhook"]') ||
                  document.querySelector('button[type="submit"]');

if (!btnSalvar) {
    console.error('AGENT3: Botão salvar não encontrado. Verifique seletor.');
}

// PASSO 2: Implementar função de salvamento
async function salvarWebhook(event) {
    event.preventDefault();
    
    // Obter valores dos campos
    const nomeInput = document.querySelector('#webhook-name') || 
                      document.querySelectorAll('input')[0];
    const urlInput = document.querySelector('#webhook-url') || 
                     document.querySelectorAll('input')[1];
    const eventoSelect = document.querySelector('#webhook-event') || 
                        document.querySelector('select');
    
    const dados = {
        name: nomeInput?.value,
        url: urlInput?.value,
        event: eventoSelect?.value
    };
    
    // Validação básica
    if (!dados.name || !dados.url || !dados.event) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    // Feedback visual
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';
    
    try {
        // Requisição para API
        const response = await fetch('/api/webhooks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Adicionar token de autenticação se necessário
                // 'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify(dados)
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const resultado = await response.json();
        
        // Sucesso
        alert('Webhook salvo com sucesso!');
        console.log('AGENT3: Webhook salvo:', resultado);
        
        // Redirecionar ou atualizar lista
        window.location.href = '/webhooks';
        // OU: window.location.reload();
        
    } catch (error) {
        console.error('AGENT3: Erro ao salvar webhook:', error);
        alert('Erro ao salvar webhook. Tente novamente.');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar';
    }
}

// PASSO 3: Registrar event listener
if (btnSalvar) {
    btnSalvar.addEventListener('click', salvarWebhook);
    console.log('AGENT3: Event listener registrado com sucesso');
}
```

**Validação:**
```bash
# Após implementar, testar:
1. Repetir passos de reprodução
2. Verificar console para logs "AGENT3:"
3. Confirmar que requisição é enviada (DevTools > Network)
4. Validar salvamento no backend
5. Confirmar redirecionamento/atualização
```

**Checklist:**
- [ ] Arquivo do componente identificado
- [ ] Event listener adicionado
- [ ] Função de salvamento implementada
- [ ] Validação de campos adicionada
- [ ] Feedback visual implementado
- [ ] Requisição API funcional
- [ ] Mensagens de erro/sucesso exibidas
- [ ] Testado e validado

---

### 🔧 TAREFA 1.2: Corrigir Dropdown "Evento Gatilho" (BUG-C002)

**Análise Inicial:**
```bash
# 1. Verificar endpoint de API
curl -X GET https://62863c59-d08b-44f5-a414-d7529041de1a-00-16zuyl87dp7m9.kirk.replit.dev/api/webhook-events

# 2. Buscar código do dropdown
grep -rn "evento.*gatilho\|event.*trigger\|select.*evento" --include="*.js" --include="*.jsx"
```

**Reprodução do Bug:**
```
PASSOS:
1. Abrir formulário de webhook
2. Clicar no dropdown "Evento Gatilho"
3. OBSERVAR: Dropdown vazio ou não abre

RESULTADO ESPERADO: Lista de eventos disponíveis
RESULTADO ATUAL: Sem opções ou dropdown não funcional
```

**Implementação da Correção:**

```javascript
// ARQUIVO: [identificar após busca] - Ex: src/components/WebhookForm.jsx

// PASSO 1: Definir lista de eventos (fallback)
const EVENTOS_PADRAO = [
    { id: 'contact_created', nome: 'Quando um novo contato for criado' },
    { id: 'lead_updated', nome: 'Quando um lead for atualizado' },
    { id: 'sale_completed', nome: 'Quando uma venda for concluída' },
    { id: 'email_sent', nome: 'Quando um email for enviado' },
    { id: 'task_completed', nome: 'Quando uma tarefa for concluída' }
];

// PASSO 2: Carregar eventos da API (com fallback)
async function carregarEventos() {
    try {
        const response = await fetch('/api/webhook-events');
        
        if (!response.ok) {
            throw new Error('API não disponível');
        }
        
        const eventos = await response.json();
        console.log('AGENT3: Eventos carregados da API:', eventos);
        return eventos;
        
    } catch (error) {
        console.warn('AGENT3: Usando eventos padrão (API falhou):', error);
        return EVENTOS_PADRAO;
    }
}

// PASSO 3: Popular dropdown
async function popularDropdownEventos() {
    const select = document.querySelector('#webhook-event') || 
                   document.querySelector('select') ||
                   document.querySelector('[name="event"]');
    
    if (!select) {
        console.error('AGENT3: Dropdown de eventos não encontrado');
        return;
    }
    
    // Limpar opções existentes
    select.innerHTML = '<option value="">Selecione um evento...</option>';
    
    // Carregar eventos
    const eventos = await carregarEventos();
    
    // Adicionar opções
    eventos.forEach(evento => {
        const option = document.createElement('option');
        option.value = evento.id;
        option.textContent = evento.nome || evento.name;
        select.appendChild(option);
    });
    
    console.log('AGENT3: Dropdown populado com', eventos.length, 'eventos');
}

// PASSO 4: Executar ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    popularDropdownEventos();
});

// OU, se for React/Vue/framework:
// useEffect(() => { popularDropdownEventos(); }, []);
```

**Validação:**
```bash
# Após implementar:
1. Abrir formulário de webhook
2. Clicar dropdown "Evento Gatilho"
3. Verificar se opções aparecem
4. Testar seleção de opções
5. Verificar console para logs "AGENT3:"
```

**Checklist:**
- [ ] Endpoint de API testado
- [ ] Lista de fallback implementada
- [ ] Função de carregamento criada
- [ ] Dropdown populado corretamente
- [ ] Tratamento de erro implementado
- [ ] Testado e validado

---

### 🔧 TAREFA 1.3: Auditar e Corrigir Navegação (BUG-C003)

**Análise Inicial:**
```bash
# 1. Localizar componentes de navegação
find . -type f -name "*menu*" -o -name "*nav*" -o -name "*sidebar*" 2>/dev/null

# 2. Buscar código de navegação
grep -rn "menu\|navbar\|navigation" --include="*.js" --include="*.jsx" --include="*.html"
```

**Reprodução do Bug:**
```
PASSOS:
1. Login no sistema
2. Identificar todos os itens de menu
3. Clicar em cada item
4. OBSERVAR: Alguns itens não respondem

RESULTADO ESPERADO: Todos os itens navegam para suas páginas
RESULTADO ATUAL: Itens não clicáveis ou sem resposta
```

**Implementação da Correção:**

```javascript
// ARQUIVO: [identificar após busca] - Ex: src/components/Navbar.jsx

// PASSO 1: Auditar todos os links de navegação
function auditarNavegacao() {
    const menuItems = document.querySelectorAll(
        '.menu-item, .nav-link, .sidebar-link, [role="menuitem"], nav a'
    );
    
    console.log(`AGENT3: Encontrados ${menuItems.length} itens de menu`);
    
    const problemas = [];
    
    menuItems.forEach((item, index) => {
        const href = item.getAttribute('href');
        const onClick = item.onclick;
        const texto = item.textContent.trim();
        
        // Verificar problemas
        if (!href && !onClick) {
            problemas.push({
                index,
                texto,
                problema: 'Sem href e sem onclick'
            });
        }
        
        if (href === '#' || href === '') {
            problemas.push({
                index,
                texto,
                problema: 'Link quebrado (#)'
            });
        }
    });
    
    console.log('AGENT3: Problemas encontrados:', problemas);
    return problemas;
}

// PASSO 2: Corrigir links quebrados
function corrigirNavegacao() {
    // Mapeamento de rotas (ajustar conforme seu sistema)
    const ROTAS = {
        'Dashboard': '/dashboard',
        'Webhooks': '/webhooks',
        'Contatos': '/contacts',
        'Leads': '/leads',
        'Configurações': '/settings',
        'Perfil': '/profile'
        // Adicionar todas as rotas do sistema
    };
    
    const menuItems = document.querySelectorAll('.menu-item, .nav-link, nav a');
    
    menuItems.forEach(item => {
        const texto = item.textContent.trim();
        const href = item.getAttribute('href');
        
        // Se link está quebrado
        if (!href || href === '#' || href === '') {
            // Tentar encontrar rota correta
            const rotaCorreta = ROTAS[texto];
            
            if (rotaCorreta) {
                item.setAttribute('href', rotaCorreta);
                console.log(`AGENT3: Link corrigido - ${texto} -> ${rotaCorreta}`);
            } else {
                console.warn(`AGENT3: Rota não mapeada para "${texto}"`);
            }
        }
        
        // Adicionar cursor pointer
        item.style.cursor = 'pointer';
        
        // Garantir que seja clicável
        if (!item.onclick && item.getAttribute('href')) {
            item.addEventListener('click', (e) => {
                const destino = item.getAttribute('href');
                if (destino && destino !== '#') {
                    window.location.href = destino;
                }
            });
        }
    });
}

// PASSO 3: Executar correções
document.addEventListener('DOMContentLoaded', () => {
    console.log('AGENT3: Iniciando auditoria de navegação');
    auditarNavegacao();
    corrigirNavegacao();
    console.log('AGENT3: Correções de navegação aplicadas');
});
```

**Validação:**
```bash
# Após implementar:
1. Abrir DevTools Console
2. Verificar logs "AGENT3:"
3. Ver lista de problemas encontrados
4. Testar cada item de menu manualmente
5. Confirmar que todos os links funcionam
```

**Checklist:**
- [ ] Componente de navegação identificado
- [ ] Auditoria de links executada
- [ ] Problemas documentados
- [ ] Links corrigidos
- [ ] Event listeners adicionados
- [ ] Todos os itens testados
- [ ] Navegação funcional

---

## 📋 FASE 2: ALTA PRIORIDADE (EXECUTAR APÓS FASE 1)

### Prazo: 2-3 dias
### Bugs: BUG-A001, BUG-A002, BUG-A003

---

### 🔧 TAREFA 2.1: Implementar Feedback Visual (BUG-A001)

**Objetivo:** Adicionar loading spinners, mensagens toast, mudanças de estado

**Implementação:**

```javascript
// ARQUIVO: src/utils/feedback.js (criar se não existir)

// Sistema de feedback global
class FeedbackSystem {
    
    // Loading spinner
    static showLoading(element, message = 'Carregando...') {
        if (!element) return;
        
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.innerHTML = `
            <span class="spinner"></span>
            ${message}
        `;
    }
    
    static hideLoading(element) {
        if (!element) return;
        
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'Salvar';
    }
    
    // Toast notifications
    static showToast(message, type = 'info') {
        // Criar elemento toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Adicionar CSS inline se necessário
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    static showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    static showError(message) {
        this.showToast(message, 'error');
    }
    
    static showInfo(message) {
        this.showToast(message, 'info');
    }
}

// Exportar para uso global
window.Feedback = FeedbackSystem;

console.log('AGENT3: Sistema de feedback inicializado');
```

**Uso:**
```javascript
// Em qualquer função
Feedback.showLoading(btnSalvar, 'Salvando...');

try {
    await salvarDados();
    Feedback.showSuccess('Salvo com sucesso!');
} catch (error) {
    Feedback.showError('Erro ao salvar');
} finally {
    Feedback.hideLoading(btnSalvar);
}
```

**Checklist:**
- [ ] Sistema de feedback criado
- [ ] Loading spinners implementados
- [ ] Toast notifications implementadas
- [ ] Integrado em todos os formulários
- [ ] Testado em todas as ações

---

### 🔧 TAREFA 2.2: Implementar Validação de Formulários (BUG-A002)

**Implementação:**

```javascript
// ARQUIVO: src/utils/validation.js

class FormValidator {
    
    static validateWebhookForm(dados) {
        const erros = [];
        
        // Nome
        if (!dados.name || dados.name.trim() === '') {
            erros.push('Nome é obrigatório');
        } else if (dados.name.length < 3) {
            erros.push('Nome deve ter no mínimo 3 caracteres');
        }
        
        // URL
        if (!dados.url || dados.url.trim() === '') {
            erros.push('URL é obrigatória');
        } else if (!this.isValidURL(dados.url)) {
            erros.push('URL inválida');
        }
        
        // Evento
        if (!dados.event) {
            erros.push('Selecione um evento');
        }
        
        return {
            valido: erros.length === 0,
            erros
        };
    }
    
    static isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    static mostrarErros(erros) {
        const mensagem = erros.join('\n');
        alert(mensagem);
        // OU usar Feedback.showError(mensagem);
    }
}

window.Validator = FormValidator;
```

**Uso:**
```javascript
const resultado = Validator.validateWebhookForm(dados);

if (!resultado.valido) {
    Validator.mostrarErros(resultado.erros);
    return;
}

// Prosseguir com salvamento
```

**Checklist:**
- [ ] Sistema de validação criado
- [ ] Validação para todos os campos
- [ ] Mensagens de erro claras
- [ ] Integrado em formulários
- [ ] Testado com dados inválidos

---

### 🔧 TAREFA 2.3: Adicionar IDs Semânticos (BUG-A003)

**Implementação:**

```javascript
// ARQUIVO: Modificar HTML/JSX dos formulários

// ANTES:
<input /> {/* índice 2 */}
<input /> {/* índice 4 */}
<select> {/* índice 6 */}

// DEPOIS:
<input 
    id="webhook-name" 
    name="webhookName" 
    aria-label="Nome do Webhook"
    placeholder="Ex: Notificação de Novos Leads"
/>

<input 
    id="webhook-url" 
    name="webhookUrl" 
    aria-label="URL de Destino"
    placeholder="https://exemplo.com/webhook"
    type="url"
/>

<select 
    id="webhook-event" 
    name="webhookEvent" 
    aria-label="Evento Gatilho"
>
    <option value="">Selecione um evento...</option>
</select>
```

**Checklist:**
- [ ] Todos os campos têm id único
- [ ] Todos os campos têm name apropriado
- [ ] Todos os campos têm aria-label
- [ ] Labels visíveis adicionados
- [ ] Acessibilidade melhorada

---

## 📋 FASE 3: MÉDIA PRIORIDADE (EXECUTAR APÓS FASE 2)

### Prazo: 1 semana
### Bugs: BUG-A004, BUG-A005, BUG-M001, BUG-M002, BUG-M003

[Instruções detalhadas para estes bugs estão no relatório completo]

---

## ✅ VALIDAÇÃO FINAL

### Após completar cada fase:

```bash
# 1. Limpar cache
# 2. Testar todas as funcionalidades corrigidas
# 3. Verificar console (sem erros)
# 4. Preencher checklist do relatório
# 5. Atualizar planilha de tracking
```

### Checklist Geral:

- [ ] FASE 1 completa (bugs críticos corrigidos)
- [ ] FASE 2 completa (alta prioridade)
- [ ] FASE 3 completa (média prioridade)
- [ ] Todos os testes passam
- [ ] Sem erros no console
- [ ] Planilha atualizada
- [ ] Documentação atualizada

---

## 📊 TRACKING DE PROGRESSO

Atualizar planilha após cada tarefa:

```
BUG-C001: Status → "Em Andamento" → "Testando" → "Resolvido"
BUG-C002: Status → "Em Andamento" → "Testando" → "Resolvido"
...
```

---

## 🚨 IMPORTANTE

1. **Executar em ORDEM:** Fase 1 → Fase 2 → Fase 3
2. **Testar APÓS CADA correção** (não acumular)
3. **Documentar problemas encontrados**
4. **Não pular validações**
5. **Limpar cache entre testes**

---

## 📞 EM CASO DE BLOQUEIO

Se encontrar algum problema:

1. Documentar o bloqueio
2. Verificar logs do console
3. Consultar relatório completo
4. Atualizar planilha (status: "Bloqueado")
5. Reportar ao responsável

---

**BOA EXECUÇÃO, AGENT3! 🤖**

*Consulte o relatório completo para detalhes adicionais de cada bug.*