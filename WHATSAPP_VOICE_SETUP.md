# WhatsApp + Voice Integration - Setup Guide

## 🚀 Overview

This system implements a hybrid messaging and voice platform:
- **WhatsApp Text**: Using whatsmeow (Docker-based)
- **Voice Escalation**: Using Vapi AI for traditional phone calls

## 📋 Prerequisites

### 1. WhatsApp whatsmeow Service

Required environment variables:
```bash
WHATSMEOW_SERVICE_URL=http://localhost:8001
WHATSMEOW_PASSWORD=your_secure_password_here
WEBHOOK_SECRET=your_webhook_secret_here
DEFAULT_COMPANY_ID=your_company_id_from_database
```

**Important:** 
- Change `WHATSMEOW_PASSWORD` from default
- Generate a strong `WEBHOOK_SECRET`
- Get `DEFAULT_COMPANY_ID` from your companies table in the database

### 2. Vapi Voice AI

Get your credentials from https://vapi.ai

Required environment variables:
```bash
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER=+1234567890
VAPI_WEBHOOK_SECRET=your_vapi_webhook_secret
```

**Setup Steps:**
1. Create Vapi account at https://vapi.ai
2. Get API key from dashboard
3. Configure Twilio phone number in Vapi (user dismissed Replit Twilio integration)
4. Set webhook URL: `https://your-domain.com/api/vapi/webhook`
5. Copy webhook secret from Vapi dashboard

### 3. Meta WhatsApp API (Optional - for summary delivery)

If you want to send call summaries via Meta API:
```bash
META_ACCESS_TOKEN=your_meta_token
META_PHONE_NUMBER_ID=your_phone_number_id
```

## 🔧 Installation

### Step 1: Start whatsmeow Service

```bash
./start-whatsmeow.sh
```

This will:
- Start Docker container with whatsmeow
- Expose UI at http://localhost:8001
- Configure webhook to Next.js

### Step 2: Connect WhatsApp

1. Access http://localhost:8001
2. Login with credentials (admin / your_WHATSMEOW_PASSWORD)
3. Scan QR code with WhatsApp
4. Wait for connection confirmation

### Step 3: Configure Environment

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
# Edit .env with your credentials
```

### Step 4: Start Next.js Server

The workflow "Frontend" is already configured. Just ensure it's running:

```bash
npm run dev:server
```

Server will be available at http://localhost:5000

## 📱 How It Works

### Message Flow

1. **User sends WhatsApp message** → whatsmeow receives it
2. **whatsmeow sends webhook** → `/api/webhook/whatsmeow`
3. **Next.js processes message:**
   - Validates company ID
   - Normalizes phone number
   - Checks for duplicates
   - Saves to database
4. **AI analyzes content:**
   - If keywords detected ("falar", "ligar", "telefone") → Escalates to voice
   - Otherwise → Sends text response

### Voice Escalation Flow

1. **Keywords detected** in WhatsApp message
2. **Vapi call initiated** via `/api/vapi/initiate-call`
3. **Confirmation sent** via WhatsApp: "Estou iniciando uma ligação..."
4. **User receives call** on their phone
5. **AI assistant converses** in Portuguese
6. **Call ends** → Transcript sent back to WhatsApp

### Voice Keywords

The system detects these keywords to trigger voice calls:
- `falar` / `ligar` / `telefone`
- `chamada` / `voz` / `call`
- `atendente`

## 🔐 Security Features

✅ **Webhook Signature Verification**
- whatsmeow: X-Webhook-Secret header validation
- Vapi: HMAC SHA256 signature verification

✅ **Phone Normalization**
- E.164 format enforcement
- JID parsing for WhatsApp IDs
- Group chat filtering

✅ **Idempotency**
- Duplicate message prevention
- Database unique constraints

✅ **Company Scoping**
- Multi-tenant support
- Contact isolation by company

## 🧪 Testing

### Test WhatsApp Integration

1. Send a message to your WhatsApp number
2. Check logs: `docker-compose -f docker-compose.whatsapp.yml logs -f`
3. Verify message appears in database

### Test Voice Escalation

1. Send message with keyword: "quero falar com atendente"
2. Should receive: "Estou iniciando uma ligação..."
3. Phone should ring within seconds
4. After call, receive transcript summary

## 📊 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhook/whatsmeow` | POST | Receives WhatsApp messages |
| `/api/whatsapp/send-whatsmeow` | POST | Sends WhatsApp messages |
| `/api/whatsapp/send-meta` | POST | Sends via Meta API |
| `/api/vapi/initiate-call` | POST | Starts voice call |
| `/api/vapi/webhook` | POST | Receives call events |

## 🐛 Troubleshooting

### whatsmeow not receiving messages

1. Check Docker container: `docker ps`
2. Verify webhook URL in docker-compose.yml
3. Check QR code scan status
4. Review logs: `docker logs master-ia-whatsmeow`

### Voice calls not working

1. Verify VAPI_API_KEY is correct
2. Check VAPI_PHONE_NUMBER format (+1234567890)
3. Ensure Twilio is configured in Vapi dashboard
4. Check webhook signature: VAPI_WEBHOOK_SECRET

### Messages not saving to database

1. Verify DEFAULT_COMPANY_ID exists in companies table
2. Check database connection
3. Review Next.js logs for errors

## 📝 Database Schema

The system uses these tables:
- `companies` - Multi-tenant companies
- `contacts` - Customer contacts (scoped by company)
- `conversations` - WhatsApp conversations
- `messages` - All messages (with provider_message_id for deduplication)

## 🚀 Production Deployment

1. **Set environment variables** in production
2. **Enable VAPI_WEBHOOK_SECRET** (enforced in production)
3. **Update webhook URLs** to production domain
4. **Configure Vapi webhook** with production URL
5. **Deploy Docker service** for whatsmeow
6. **Monitor logs** for errors

## 📞 Support

For issues or questions:
1. Check logs first
2. Verify all environment variables
3. Test with simple messages
4. Review this documentation

## 🎯 Next Steps

Once configured, you can:
- [ ] Train AI assistant with custom prompts
- [ ] Add more voice keywords
- [ ] Customize call summaries
- [ ] Integrate with CRM
- [ ] Add analytics dashboard
- [ ] Implement call recording
- [ ] Add multi-language support
