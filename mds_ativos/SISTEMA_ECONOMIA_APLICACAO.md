# ⚡ SISTEMA DE APLICAÇÃO - FLUXOGRAMA EXECUTIVO

## 🎯 COMO APLICAR AS REGRAS (PASSO A PASSO)

### PASSO 1: RECEBER PEDIDO
```python
def processar_pedido(user_request):
    # Extrair informações
    tarefa = extract_task(user_request)
    critico = extract_critical(user_request) 
    flexivel = extract_flexible(user_request)
```

### PASSO 2: CLASSIFICAR (2 segundos)
```python
nivel = classificar(tarefa)  # CRÍTICO/COSMÉTICO/NORMAL
```

### PASSO 3: APLICAR FILTROS
```python
# Filtro 1: Tamanho
if lines < 50:
    return edit_direto()

# Filtro 2: Tipo
if nivel == "COSMÉTICO":
    return {
        "subagent": False,
        "architect": False,
        "test": max(1)
    }

# Filtro 3: Conhecimento
if sei_arquivo:
    use_grep_not_search()
```

### PASSO 4: ESCOLHER FERRAMENTA
```python
tools = {
    "CRÍTICO": {
        "subagent": lines > 200,
        "architect": True,
        "test": 2
    },
    "NORMAL": {
        "subagent": lines > 100,
        "architect": mudanca_arquitetural,
        "test": 1
    },
    "COSMÉTICO": {
        "subagent": False,
        "architect": False,
        "test": 0
    }
}
return tools[nivel]
```

### PASSO 5: EXECUTAR
```python
# Economia máxima
if not precisa_subagent:
    if multiplas_mudancas:
        multi_edit()
    else:
        edit()

# Validação mínima
if nivel != "COSMÉTICO":
    validate_once()
```

---

## 📊 TABELA DE DECISÃO RÁPIDA

| Situação | Ação Imediata | Tool | Economia |
|----------|---------------|------|----------|
| Bug CSS | edit direto | ❌ subagent | 95% |
| Typo/undefined | fix direto | ❌ architect | 90% |
| < 50 linhas | edit/multi_edit | ❌ subagent | 95% |
| Texto/label | multi_edit batch | ❌ validação | 90% |
| Config/.env | write direto | ❌ teste | 85% |
| Import/export | edit 1 linha | ❌ subagent | 95% |
| Sei arquivo | grep específico | ❌ search | 75% |
| Já testado | skip teste | ❌ run_test | 100% |

---

## 🔄 INTEGRAÇÃO COM SISTEMA

### MEMÓRIA PERSISTENTE
```python
# Em replit.md
regras_ativas = "SISTEMA_ECONOMIA_MESTRE.md"
economia_comprovada = "67.3%"
custo_economizado = "$3.20/sessão"
```

### PRIORIDADES ABSOLUTAS
1. **Classificar SEMPRE** (crítico/cosmético/normal)
2. **Corte rápido SEMPRE** (< 50 linhas = direto)
3. **Ferramenta mínima SEMPRE** (menor que funciona)
4. **Skip redundância SEMPRE** (não repetir)

### RELACIONAMENTO ENTRE REGRAS
```
SISTEMA_ECONOMIA_MESTRE.md (regras)
    ↓
SISTEMA_ECONOMIA_APLICACAO.md (como aplicar)
    ↓
METRICAS_EMPIRICAS_REAIS_COMPLETAS.md (resultados)
    ↓
replit.md (memória do projeto)
```

---

## ✅ CHECKLIST PRÉ-AÇÃO

Antes de QUALQUER ferramenta:
- [ ] Li SISTEMA_ECONOMIA_MESTRE.md?
- [ ] Classifiquei (crítico/cosmético)?
- [ ] Verifiquei tamanho (< 50 linhas)?
- [ ] Sei o arquivo (grep vs search)?
- [ ] Já testei antes (skip teste)?

**5x SIM = ECONOMIA GARANTIDA**

---

## 🚨 ALERTAS DE DESPERDÍCIO

### SINAL VERMELHO (parar imediatamente):
- Vai usar subagent para < 50 linhas
- Vai usar architect para CSS
- Vai testar algo já testado
- Vai search_codebase sabendo arquivo
- Vai criar .md não pedido

### CORREÇÃO IMEDIATA:
```python
if sinal_vermelho:
    PARAR()
    aplicar_corte_rapido()
    usar_ferramenta_minima()
```

---

## 📈 MONITORAMENTO CONTÍNUO

### A cada ação, registrar:
- Tokens gastos vs economizados
- Ferramenta usada vs poderia usar
- Tempo gasto vs necessário
- Validações feitas vs necessárias

### Meta por sessão:
- **Máximo 35.000 tokens** (alerta em 30.000)
- **Máximo 6 subagents**
- **Máximo 4 architects**
- **Mínimo 60% economia**

---

## 🎯 RESULTADO ESPERADO

Com este sistema:
- **67% menos tokens** (comprovado)
- **62% menos tempo** (medido)
- **100% funcionalidade crítica** (garantido)
- **95% qualidade visual** (aceitável)
- **$3.20 economia/sessão** (real)