// src/app/api/v1/ia/personas/[personaId]/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyIdFromSession } from '@/app/actions';
import { db } from '@/lib/db';
import { aiPersonas, aiCredentials } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface TestRequest {
  message: string;
  conversationHistory?: TestMessage[];
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { personaId: string } }
) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { personaId } = params;
    const { message, conversationHistory = [] }: TestRequest = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 });
    }

    const persona = await db.query.aiPersonas.findFirst({
      where: and(
        eq(aiPersonas.id, personaId),
        eq(aiPersonas.companyId, companyId)
      ),
    });

    if (!persona) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
    }

    let apiKey = process.env.OPENAI_API_KEY || process.env.openai_apikey_gpt_padrao;

    if (persona.credentialId) {
      const credential = await db.query.aiCredentials.findFirst({
        where: eq(aiCredentials.id, persona.credentialId),
      });
      
      if (credential?.apiKey) {
        apiKey = credential.apiKey;
      }
    }
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key não configurada para este agente' 
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: persona.systemPrompt || 'Você é um assistente virtual prestativo.',
      },
    ];

    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    messages.push({
      role: 'user',
      content: message,
    });

    const temperature = parseFloat(String(persona.temperature || 0.7));
    const maxTokens = parseInt(String(persona.maxOutputTokens || 500), 10);

    const completion = await openai.chat.completions.create({
      model: persona.model,
      messages,
      temperature: isNaN(temperature) ? 0.7 : Math.max(0, Math.min(2, temperature)),
      max_tokens: isNaN(maxTokens) ? 500 : Math.max(1, Math.min(4000, maxTokens)),
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json({ 
        error: 'IA retornou resposta vazia' 
      }, { status: 500 });
    }

    const updatedHistory: TestMessage[] = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'assistant', content: aiResponse, timestamp: Date.now() },
    ];

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationHistory: updatedHistory,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: persona.model,
    });
  } catch (error: any) {
    console.error('Erro ao testar agente:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json({ 
        error: 'Quota da API excedida. Verifique sua conta OpenAI.' 
      }, { status: 402 });
    }
    
    if (error.code === 'invalid_api_key') {
      return NextResponse.json({ 
        error: 'API Key inválida. Verifique as credenciais do agente.' 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      error: 'Erro ao processar mensagem: ' + error.message 
    }, { status: 500 });
  }
}
