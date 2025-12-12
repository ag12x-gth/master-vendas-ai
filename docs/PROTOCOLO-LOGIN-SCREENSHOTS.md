# 📋 PROTOCOLO: LOGIN OBRIGATÓRIO ANTES DE SCREENSHOTS

## Obrigatoriedade Imutável
Seguindo arquivo `pasted-obrigatoriedades-regra-imutavel-absoluto.txt`:
- **Item 1**: Os screenshots de frontend NUNCA devem ser realizados sem login prévio
- **Item 2**: Adicionar protocolo LOGIN em todas as validações/testes
- **Item 3**: Testes SEMPRE via screenshot DEPOIS via código
- **Item 4**: Protocolo deve estar nas regras e protocolos de TODOS os agents/subagents/tools

## Fluxo de Teste Obrigatório

### FASE 1: LOGIN
```
1. Abrir navegador
2. Acessar: https://masteria.app/login
3. Email: diegomaninhu@gmail.com
4. Senha: MasterIA2025!
5. Aguardar redirect para dashboard
6. ✅ Validar login com sucesso (verificar header/sidebar)
```

### FASE 2: NAVEGAÇÃO
```
1. Ir para: /super-admin/settings
2. Selecionar aba: "Webhooks de Entrada"
3. ✅ Validar tabela webhooks carregada
4. ✅ Validar botão "Histórico de Eventos" visível
```

### FASE 3: TESTE DROPDOWN
```
1. Clicar no botão "Histórico de Eventos"
2. ✅ Dropdown abre mostrando eventos
3. ✅ Exibe "Processados: X" e "Pendentes: Y"
4. ✅ Tabela com colunas: Tipo, Cliente, Origem, Status, Data/Hora
5. ✅ Badge diferencia: "Processado" (verde) vs "Pendente" (cinza)
```

### FASE 4: TESTE MOBILE RESPONSIVIDADE
```
1. Abrir DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Selecionar: iPhone 12 (390x844)
4. ✅ Hamburger menu visível (md:hidden)
5. ✅ Clique abre sidebar
6. ✅ Tabela faz scroll horizontal
7. ✅ Dropdown eventos acessível em mobile
```

## Evidence Collection

### Screenshot 1: Login
- URL: masteria.app/login
- User: diegomaninhu@gmail.com
- Status: ✅ Login successful

### Screenshot 2: Super-Admin Dashboard
- URL: masteria.app/super-admin/
- Validar: Painel principal carregado

### Screenshot 3: Webhooks Manager
- URL: masteria.app/super-admin/settings?tab=webhooks_entrada
- Validar: Tabela webhooks + botão "Histórico"

### Screenshot 4: Event Dropdown (Desktop)
- Validar: Dropdown aberto, tabela visível
- Colunas: Tipo | Cliente | Origem | Status | Data

### Screenshot 5: Mobile Responsive
- Device: iPhone 12
- Validar: Hamburger menu, sidebar toggle, scroll horizontal

### Screenshot 6: Mobile Dropdown
- Device: iPhone 12
- Validar: Dropdown acessível, eventos legíveis

## Checklist de Validação

**Login:**
- [ ] Email aceito
- [ ] Senha aceita
- [ ] Redirect para dashboard
- [ ] Sidebar aparece

**Super-Admin Desktop:**
- [ ] Layout responsive (desktop)
- [ ] Tabela webhooks visível
- [ ] URL copiável
- [ ] Secret visível/ocultável
- [ ] Histórico button presente

**Dropdown de Eventos:**
- [ ] Abre/fecha ao clicar
- [ ] Mostra eventos recentes
- [ ] Badges "Processado/Pendente" funcionam
- [ ] Tabela scrollável se muitos eventos
- [ ] Data formatada corretamente

**Mobile (< 768px):**
- [ ] Hamburger menu visible
- [ ] Sidebar collapse/expand funciona
- [ ] Tabela faz scroll horizontal
- [ ] Dropdown toca sem problema
- [ ] Nenhum overflow layout

**Funcionalidade:**
- [ ] API /api/v1/webhooks/incoming/events retorna dados
- [ ] Contadores (tratados/pendentes) corretos
- [ ] Sem erros no console
- [ ] Performance aceitável

---

## Padrão de Comando para Testes

```bash
# Antes de QUALQUER screenshot/teste no FRONTEND:
echo "🔐 PROTOCOLO LOGIN INICIADO"
echo "Acessando: https://masteria.app/login"
echo "Credenciais: diegomaninhu@gmail.com / MasterIA2025!"
echo "Aguardando: redirect para dashboard..."
# [FAZER LOGIN AQUI]
echo "✅ LOGIN CONCLUÍDO - Screenshot agora permitido"
```

---

Este protocolo é **OBRIGATÓRIO** para todos os testes de frontend.
