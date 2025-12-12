
// src/app/api/v1/ia/personas/[personaId]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiPersonas, personaPromptSections } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { parsePromptIntoSections } from '@/lib/rag/prompt-parser';

const personaUpdateSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório').optional(),
  systemPrompt: z.string().optional().nullable(),
  provider: z.enum(['OPENAI']).optional(),
  model: z.string().min(1).optional(),
  credentialId: z.string().uuid().optional().nullable(),
  temperature: z.string().optional(),
  topP: z.string().optional(),
  maxOutputTokens: z.number().int().optional(),
  mcpServerUrl: z.string().url("A URL do servidor MCP é inválida.").optional().nullable(),
  mcpServerHeaders: z.record(z.string()).optional().nullable(),
  useRag: z.boolean().optional(),
  firstResponseMinDelay: z.number().int().min(0).optional(),
  firstResponseMaxDelay: z.number().int().min(0).optional(),
  followupResponseMinDelay: z.number().int().min(0).optional(),
  followupResponseMaxDelay: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    if (data.firstResponseMinDelay !== undefined && data.firstResponseMaxDelay !== undefined) {
      return data.firstResponseMinDelay <= data.firstResponseMaxDelay;
    }
    return true;
  },
  { message: 'Delay mínimo da primeira resposta deve ser menor ou igual ao máximo', path: ['firstResponseMinDelay'] }
).refine(
  (data) => {
    if (data.followupResponseMinDelay !== undefined && data.followupResponseMaxDelay !== undefined) {
      return data.followupResponseMinDelay <= data.followupResponseMaxDelay;
    }
    return true;
  },
  { message: 'Delay mínimo de demais respostas deve ser menor ou igual ao máximo', path: ['followupResponseMinDelay'] }
);

// GET /api/v1/ia/personas/[personaId] - Fetch a single agent

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

        const [currentAgent] = await db.select()
            .from(aiPersonas)
            .where(and(eq(aiPersonas.id, personaId), eq(aiPersonas.companyId, companyId)));

        if (!currentAgent) {
            return NextResponse.json({ error: 'Agente não encontrado ou não pertence à sua empresa.' }, { status: 404 });
        }

        const ragWasActivated = !currentAgent.useRag && parsed.data.useRag === true;
        const promptToMigrate = parsed.data.systemPrompt ?? currentAgent.systemPrompt;

        const [updated] = await db.update(aiPersonas)
            .set({
                ...parsed.data,
                provider: 'OPENAI',
                updatedAt: new Date(),
            })
            .where(and(eq(aiPersonas.id, personaId), eq(aiPersonas.companyId, companyId)))
            .returning();
            
        if (!updated) {
            return NextResponse.json({ error: 'Agente não encontrado ou não pertence à sua empresa.' }, { status: 404 });
        }

        if (ragWasActivated && promptToMigrate && promptToMigrate.trim().length > 0) {
            console.log('[PersonaAPI] RAG foi ativado em agente existente com systemPrompt - fazendo migração automática...');
            
            try {
                const sections = await parsePromptIntoSections(
                    promptToMigrate,
                    {
                        useAI: true,
                        defaultLanguage: 'pt',
                    },
                    companyId
                );

                console.log(`[PersonaAPI] Parser gerou ${sections.length} seções, salvando no banco...`);

                const sectionValues = sections.map(section => ({
                    personaId: updated.id,
                    sectionName: section.sectionName,
                    content: section.content,
                    language: section.language,
                    priority: section.priority,
                    tags: section.tags || [],
                    isActive: true,
                }));

                await db.insert(personaPromptSections).values(sectionValues);

                console.log(`[PersonaAPI] ✅ ${sections.length} seções RAG criadas - systemPrompt preservado`);
                
                return NextResponse.json({
                    ...updated,
                    _ragSectionsCreated: sections.length,
                });

            } catch (parserError) {
                console.error('[PersonaAPI] Erro ao fazer migração automática:', parserError);
                console.log('[PersonaAPI] Mantendo systemPrompt original, usuário pode migrar manualmente');
            }
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
