# Sistema de Análise de Reuniões em Tempo Real - Guia de Teste

## Visão Geral
Sistema completo para análise de reuniões do Google Meet em tempo real, com detecção de emoções, análise de sentimento e geração automática de insights usando IA.

## Pré-requisitos

### API Keys Necessárias
As seguintes chaves de API devem estar configuradas nos Replit Secrets:

1. **MEETING_BAAS_API_KEY** - Chave da API Meeting BaaS
   - Obtida em: https://meetingbaas.com
   - Custo: ~$0.69/hora

2. **HUME_API_KEY** - Chave da API Hume AI
   - Obtida em: https://hume.ai
   - Custo: ~$0.0276/minuto

3. **GEMINI_API_KEY** ou **GOOGLE_GENERATIVE_AI_API_KEY** - Para geração de insights
   - Obtida em: https://ai.google.dev

4. **JWT_SECRET_KEY** - Para autenticação Socket.IO
   - Gerar uma string aleatória segura

## Fluxo de Funcionamento

### 1. Criar Reunião
```bash
POST /api/v1/meetings
Headers:
  x-company-id: <company-id>
  
Body:
{
  "googleMeetUrl": "https://meet.google.com/abc-defg-hij",
  "closerId": "<user-id>",
  "leadId": "<lead-id>",
  "scheduledStartTime": "2024-10-03T15:00:00Z"
}
```

**Resposta esperada:**
- `botId`: ID do bot Meeting BaaS
- `meeting`: Dados da reunião criada
- Status: "scheduled"

### 2. Bot Entra na Reunião
Quando o bot entra no Google Meet:
- Webhook recebe evento `bot.joined`
- Status da reunião muda para "in_progress"
- Frontend se conecta via Socket.IO

### 3. Análise em Tempo Real

#### Transcrições
- Webhook recebe eventos `transcript.partial` e `transcript.final`
- Sistema analisa sentimento do texto (positivo/negativo/neutro)
- Dados são salvos em `meeting_analysis_realtime`
- Socket.IO emite evento `transcript_update` para o frontend

#### Emoções
- Webhook recebe eventos `video.frame`
- Sistema analisa emoções faciais usando Hume AI
- Socket.IO emite evento `emotion_update` para o frontend

### 4. Frontend (Painel do Closer)
Acessar: `/meetings/[id]`

**Componentes visualizados:**
- **Transcrição em Tempo Real**: Lista de falas com sentimento
- **Análise de Emoções**: Gráfico de emoções dominantes
- **Status de Conexão**: Badge verde/vermelho

### 5. Finalização da Reunião
```bash
PATCH /api/v1/meetings/[id]
Body:
{
  "status": "completed"
}
```

**Processo:**
1. Bot sai da reunião
2. Sistema gera insights usando Gemini AI
3. Insights salvos em `meeting_insights`
4. Frontend exibe resumo completo

## Estrutura do Banco de Dados

### Tabela: meetings
- googleMeetUrl
- meetingBaasId (botId)
- status (scheduled/in_progress/completed/cancelled)
- scheduledFor, botJoinedAt, botLeftAt

### Tabela: meeting_analysis_realtime
- meetingId
- timestamp
- transcript
- speaker
- sentiment
- sentimentScore
- emotions

### Tabela: meeting_insights
- meetingId
- summaryText
- keyPoints
- painPoints
- interests
- objections
- leadScore
- recommendedProposal
- nextSteps
- overallSentiment
- engagementLevel

## Testando Localmente

### 1. Verificar Conexão Socket.IO
```javascript
// No console do navegador
const socket = io({
  path: '/api/socketio',
  auth: { token: 'seu-jwt-token' }
});

socket.on('connect', () => {
  console.log('Conectado:', socket.id);
  socket.emit('join_meeting', 'meeting-id');
});

socket.on('transcript_update', (data) => {
  console.log('Transcrição:', data);
});
```

### 2. Simular Webhook
```bash
curl -X POST http://localhost:5000/api/v1/meetings/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transcript.final",
    "bot_id": "bot-123",
    "data": {
      "text": "Olá, gostei muito da apresentação!",
      "speaker": "Lead"
    }
  }'
```

### 3. Verificar Insights
```bash
curl http://localhost:5000/api/v1/meetings/[id]
```

## Troubleshooting

### Socket.IO não conecta
- Verificar se JWT_SECRET_KEY está configurado
- Confirmar que /api/auth/socket-token retorna token válido
- Checar console do navegador para erros de autenticação

### Webhook não processa eventos
- Verificar se global.io está disponível (checar logs do servidor)
- Confirmar que bot_id corresponde ao meetingBaasId na tabela meetings
- Validar estrutura do payload do webhook

### Insights não são gerados
- Verificar se GEMINI_API_KEY está configurado
- Confirmar que existem dados em meeting_analysis_realtime
- Checar logs do AIAnalysisService

## Custos Estimados

### Por reunião de 30 minutos:
- Meeting BaaS: ~R$10,35
- Hume AI: ~R$4,20
- **Total: ~R$15,00**

### Por reunião de 1 hora:
- Meeting BaaS: ~R$20,70
- Hume AI: ~R$8,40
- **Total: ~R$29,10**

## Próximos Passos

1. **Testar fluxo completo:**
   - Criar reunião real no Google Meet
   - Verificar transcrições em tempo real
   - Validar geração de insights

2. **Integrar com CRM:**
   - Associar reuniões a leads do Kanban
   - Atualizar scores automaticamente
   - Enviar notificações

3. **Otimizações:**
   - Cache de insights
   - Compressão de dados
   - Rate limiting de webhooks

## Suporte
Para problemas ou dúvidas, verificar:
- Logs do servidor: `/tmp/logs/Frontend_*.log`
- Console do navegador
- Documentação Meeting BaaS: https://docs.meetingbaas.com
- Documentação Hume AI: https://docs.hume.ai
