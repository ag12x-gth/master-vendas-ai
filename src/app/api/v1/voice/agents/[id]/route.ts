import { NextRequest, NextResponse } from 'next/server';
import { voiceAIPlatform, UpdateAgentDto } from '@/lib/voice-ai-platform';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['inbound', 'outbound', 'transfer']).optional(),
  systemPrompt: z.string().min(1).optional(),
  firstMessage: z.string().optional(),
  voiceId: z.string().optional(),
  llmModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const agent = await voiceAIPlatform.getAgent(params.id);

    logger.info('Voice agent fetched', { agentId: params.id });

    return NextResponse.json({
      success: true,
      data: agent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching voice agent', { agentId: params.id, error });
    
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Falha ao buscar agente de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = updateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: UpdateAgentDto = validation.data;
    const agent = await voiceAIPlatform.updateAgent(params.id, updateData);

    logger.info('Voice agent updated', { agentId: params.id, updates: Object.keys(updateData) });

    return NextResponse.json({
      success: true,
      data: agent,
      message: 'Agente atualizado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating voice agent', { agentId: params.id, error });
    
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Falha ao atualizar agente de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!voiceAIPlatform.isConfigured()) {
      return NextResponse.json(
        { error: 'Voice AI Platform não configurado' },
        { status: 503 }
      );
    }

    await voiceAIPlatform.deleteAgent(params.id);

    logger.info('Voice agent deleted', { agentId: params.id });

    return NextResponse.json({
      success: true,
      message: 'Agente excluído com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting voice agent', { agentId: params.id, error });
    
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Falha ao excluir agente de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
