
// src/app/api/v1/ia/personas/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiPersonas } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';

const personaCreateSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  systemPrompt: z.string().optional().nullable(),
  provider: z.enum(['GEMINI', 'OPENAI']).optional(), // Tornando opcional
  model: z.string().min(1),
  credentialId: z.string().uuid().optional().nullable(),
  temperature: z.string(),
  topP: z.string(),
  maxOutputTokens: z.number().int().optional(),
});


export async function GET(_request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const personas = await db.query.aiPersonas.findMany({
            where: eq(aiPersonas.companyId, companyId),
            orderBy: desc(aiPersonas.createdAt),
        });
        return NextResponse.json(personas);
    } catch (error) {
        console.error('Erro ao buscar agentes:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = personaCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        
        const [newPersona] = await db.insert(aiPersonas).values({
            companyId,
            ...parsed.data,
            provider: 'OPENAI', // Força o provedor como OpenAI
        }).returning();

        return NextResponse.json(newPersona, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar agente:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
