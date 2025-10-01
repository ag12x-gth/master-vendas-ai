
// src/app/api/v1/ia/personas/[personaId]/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiPersonas } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

const personaUpdateSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').optional(),
  systemPrompt: z.string().optional().nullable(),
  provider: z.enum(['GEMINI', 'OPENAI']).optional(),
  model: z.string().min(1).optional(),
  credentialId: z.string().uuid().optional().nullable(),
  temperature: z.string().optional(),
  topP: z.string().optional(),
  maxOutputTokens: z.number().int().optional(),
  mcpServerUrl: z.string().url("A URL do servidor MCP é inválida.").optional().nullable(),
  mcpServerHeaders: z.record(z.string()).optional().nullable(),
});

// GET /api/v1/ia/personas/[personaId] - Fetch a single agent
export async function GET(_request: NextRequest, { params }: { params: { personaId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { personaId } = params;

        const [agent] = await db.select()
            .from(aiPersonas)
            .where(and(eq(aiPersonas.id, personaId), eq(aiPersonas.companyId, companyId)));
            
        if (!agent) {
            return NextResponse.json({ error: 'Agente não encontrado ou não pertence à sua empresa.' }, { status: 404 });
        }

        return NextResponse.json(agent);
    } catch (error) {
        console.error('Erro ao buscar agente:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}


export async function PUT(request: NextRequest, { params }: { params: { personaId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { personaId } = params;
        const body = await request.json();
        const parsed = personaUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        
        const [updated] = await db.update(aiPersonas)
            .set({
                ...parsed.data,
                provider: 'OPENAI', // Força o provedor
                updatedAt: new Date(),
            })
            .where(and(eq(aiPersonas.id, personaId), eq(aiPersonas.companyId, companyId)))
            .returning();
            
        if (!updated) {
            return NextResponse.json({ error: 'Agente não encontrado ou não pertence à sua empresa.' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Erro ao atualizar agente:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: { personaId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { personaId } = params;

        await db.delete(aiPersonas)
            .where(and(eq(aiPersonas.id, personaId), eq(aiPersonas.companyId, companyId)));
            
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Erro ao excluir agente:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
