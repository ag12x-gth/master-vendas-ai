import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform, CreateAgentDto } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['inbound', 'outbound', 'transfer']),
  systemPrompt: z.string().min(1, 'System prompt é obrigatório'),
  firstMessage: z.string().optional(),
  voiceId: z.string().default('pt-BR-FranciscaNeural'),
  llmModel: z.string().default('gpt-4'),
  temperature: z.number().min(0).max(2).default(0.7),
});

export async function GET(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const agents = await voiceAIPlatform.listAgents();
    
    let filteredAgents = agents;
    if (status && ['active', 'inactive', 'archived'].includes(status)) {
      filteredAgents = agents.filter(a => a.status === status);
    }

    logger.info('Voice agents listed', { count: filteredAgents.length, status });

    return NextResponse.json({
      success: true,
      data: filteredAgents,
      total: filteredAgents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error listing voice agents', { error });
    return NextResponse.json(
      { error: 'Falha ao listar agentes de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = createAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const agentData: CreateAgentDto = validation.data;
    const agent = await voiceAIPlatform.createAgent(agentData);

    logger.info('Voice agent created', { agentId: agent.id, name: agent.name });

    return NextResponse.json({
      success: true,
      data: agent,
      message: 'Agente criado com sucesso',
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating voice agent', { error });
    return NextResponse.json(
      { error: 'Falha ao criar agente de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
