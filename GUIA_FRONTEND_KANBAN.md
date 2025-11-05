# 🗺️ GUIA COMPLETO: Como Acessar o Kanban e Configuração de Agentes IA

## ✅ **PROBLEMAS CORRIGIDOS (05/11/2025)**
- ✅ Links corrigidos: `/funnels/` → `/kanban/`
- ✅ Página de criação de funil criada em `/kanban/new`
- ✅ Menu de navegação atualizado com item "Pipeline Kanban"
- ✅ Erro do SelectItem corrigido em todos os componentes (criação de funil + configuração de agentes IA)

---

## 📍 **1. ONDE ESTÁ NO MENU**

Após fazer login, você verá no **menu lateral esquerdo**:

```
📊 Dashboard
🆘 Primeiros Passos
💬 Atendimentos
🌲 Automações
📋 Pipeline Kanban  ← NOVO! Acesse aqui
👥 Leads
   ├─ Contatos
   ├─ Listas
   └─ Tags
📱 WhatsApp
   ├─ Campanhas
   ├─ Modelos
   ├─ Conexões Meta API
   └─ Sessões Baileys
💬 SMS
🖼️ Galeria
🤖 Agentes de IA
📞 Voice Calls
🎥 Reuniões
🔀 Roteamento
```

---

## 🎯 **2. PASSO A PASSO: Como Usar o Sistema**

### **ETAPA 1: Criar Agentes de IA**

1. **Menu lateral** → Clique em **🤖 Agentes de IA**
2. Crie diferentes agentes para diferentes situações:
   - **Exemplo 1**: "Agente Vendas Ativo" (para quando você inicia contato)
   - **Exemplo 2**: "Agente Vendas Passivo" (para quando o cliente te procura)
   - **Exemplo 3**: "Agente Suporte Ativo"
   - **Exemplo 4**: "Agente Suporte Passivo"

---

### **ETAPA 2: Acessar o Pipeline Kanban**

1. **Menu lateral** → Clique em **📋 Pipeline Kanban**
2. Você verá uma **lista de funis** (se não houver, crie um novo)
3. Cada funil pode ser de tipos diferentes:
   - **LEAD_CAPTURE** (Captação de Leads)
   - **SALES** (Vendas)
   - **CUSTOMER_SUCCESS** (Customer Success)
   - **RETENTION** (Retenção)

---

### **ETAPA 3: Configurar Agentes IA no Funil**

1. **Clique em um funil** da lista
2. Você verá **2 ABAS** no topo:

   ```
   [ 📋 Visualização do Funil ]  [ 🤖 Agentes IA por Estágio ]
   ```

3. **Clique na aba "Agentes IA por Estágio"**

---

### **ETAPA 4: Configurar Agentes (2 Níveis)**

Na tela de configuração você verá:

#### **🎯 SEÇÃO 1: Configuração Padrão do Funil (Fallback Global)**

```
┌─────────────────────────────────────────────────┐
│  🎯 Configuração Padrão do Funil                │
│  ⚡ Fallback Global                             │
├─────────────────────────────────────────────────┤
│  Estes agentes serão usados quando não houver   │
│  configuração específica para o estágio do lead │
├─────────────────────────────────────────────────┤
│  👤 Agente Padrão (Contato Ativo)              │
│  [Selecione um agente...]  ▼                    │
│                                                 │
│  👥 Agente Padrão (Contato Passivo)            │
│  [Selecione um agente...]  ▼                    │
└─────────────────────────────────────────────────┘
```

**O que fazer:**
- Selecione o agente para quando **VOCÊ** inicia contato (campanhas, mensagens avulsas)
- Selecione o agente para quando o **CLIENTE** te procura espontaneamente

---

#### **📊 SEÇÃO 2: Configurações por Estágio**

Abaixo, você verá cada estágio do seu funil:

```
┌─────────────────────────────────────────────────┐
│  Novo Lead                            [ OPEN ]   │
├─────────────────────────────────────────────────┤
│  👤 Agente (Contato Ativo - Outbound)          │
│  [Selecione um agente...]  ▼                    │
│  Usado quando o agente inicia contato           │
│                                                 │
│  👥 Agente (Contato Passivo - Inbound)         │
│  [Selecione um agente...]  ▼                    │
│  Usado quando o contato inicia conversa         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Qualificado                         [ OPEN ]   │
├─────────────────────────────────────────────────┤
│  👤 Agente (Contato Ativo - Outbound)          │
│  [Selecione um agente...]  ▼                    │
│                                                 │
│  👥 Agente (Contato Passivo - Inbound)         │
│  [Selecione um agente...]  ▼                    │
└─────────────────────────────────────────────────┘

... (e assim por diante para cada estágio)
```

**O que fazer:**
- Configure agentes **ESPECÍFICOS** para cada estágio (opcional)
- Se não configurar, usa o agente padrão do funil

---

## 🔄 **3. COMO FUNCIONA O SISTEMA DE FALLBACK (HIERARQUIA COMPLETA)**

Quando um cliente manda mensagem, o sistema escolhe o agente seguindo esta ordem de prioridade:

```
1️⃣ TEM configuração específica do estágio? (PRIORIDADE MÁXIMA)
   ├─ SIM → USA esse agente ✅
   └─ NÃO → Vai para o próximo nível ⬇️

2️⃣ TEM configuração padrão do funil?
   ├─ SIM → USA esse agente ✅
   └─ NÃO → Vai para o próximo nível ⬇️

3️⃣ TEM agente padrão na Conexão WhatsApp?
   ├─ SIM → USA esse agente ✅
   └─ NÃO → Vai para o próximo nível ⬇️

4️⃣ TEM agente manual configurado em /atendimentos? (ÚLTIMO FALLBACK)
   ├─ SIM → USA esse agente ✅
   └─ NÃO → Vai para o próximo nível ⬇️

5️⃣ USA "Agente Genérico" (resposta básica) ⚠️
```

**⚠️ IMPORTANTE:** A configuração manual em `/atendimentos` é apenas um **fallback de emergência**, usado somente quando nenhuma outra configuração existe.

---

## 💡 **4. EXEMPLO PRÁTICO: Funil de Vendas**

### **Configuração Sugerida:**

**Funil:** "Pipeline de Vendas" (tipo: SALES)

**Configuração Padrão do Funil:**
- **Contato Ativo**: "Agente Vendedor Proativo"
- **Contato Passivo**: "Agente Vendedor Receptivo"

**Estágio "Novo Lead":**
- **Contato Ativo**: "Agente Qualificador Agressivo"
- **Contato Passivo**: "Agente Qualificador Suave"

**Estágio "Proposta Enviada":**
- **Contato Ativo**: "Agente Closer Insistente"
- **Contato Passivo**: "Agente Closer Consultivo"

**Estágio "Fechado (Ganho)":**
- **Ambos**: (deixe vazio, usa padrão do funil ou conexão)

---

## 🎨 **5. O QUE VOCÊ VÊ NO FRONTEND**

### **Tela 1: Lista de Funis** (`/kanban`)
- Visualização de todos os funis criados
- Botão para criar novo funil
- Estatísticas de cada funil

### **Tela 2: Visualização do Funil** (`/kanban/[funnelId]` - Aba 1)
- Kanban tradicional com colunas (estágios)
- Cards de leads que podem ser arrastados
- Detalhes de cada lead

### **Tela 3: Configuração de Agentes IA** (`/kanban/[funnelId]` - Aba 2)
- Seção de configuração padrão do funil
- Seções individuais para cada estágio
- Dropdown para selecionar agentes
- Indicadores visuais de configuração ativa

---

## 🔍 **6. VERIFICAR SE ESTÁ FUNCIONANDO**

### **Como testar:**

1. Configure um agente para um estágio específico
2. Envie uma mensagem de WhatsApp para um contato que está nesse estágio
3. Verifique nos **logs de automação**:
   - Menu → **🌲 Automações** → Clique em **"Ver Logs"**
   - Procure por linhas como:
     ```
     ✅ Agente IA selecionado (nível estágio): 
        Funil="Pipeline de Vendas", 
        Estágio="Novo Lead", 
        Tipo="PASSIVE"
     ```

---

## 🎯 **7. RESUMO: O QUE ESTÁ VISÍVEL NO FRONTEND**

✅ **Menu Lateral**
- Item "Pipeline Kanban" adicionado

✅ **Página de Funis** (`/kanban`)
- Lista todos os funis criados
- Permite criar novos funis

✅ **Página do Funil** (`/kanban/[funnelId]`)
- **Aba 1**: Visualização Kanban tradicional
- **Aba 2**: Configuração de Agentes IA (NOVO!)
  - Seção de fallback global do funil
  - Seções individuais para cada estágio
  - Seleção de agentes para ACTIVE/PASSIVE

✅ **Sistema de Logs** (`/automations`)
- Mostra qual agente foi selecionado e por quê
- Permite debugar o sistema de fallback

---

## 🚀 **PRÓXIMOS PASSOS PARA VOCÊ**

1. ✅ Faça login no sistema
2. ✅ Acesse **Pipeline Kanban** no menu
3. ✅ Crie ou abra um funil existente
4. ✅ Clique na aba **"Agentes IA por Estágio"**
5. ✅ Configure os agentes conforme sua estratégia
6. ✅ Teste enviando mensagens via WhatsApp
7. ✅ Verifique os logs para confirmar funcionamento

---

**🎉 Tudo está pronto e funcionando! Basta acessar e configurar!**
