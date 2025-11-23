
// src/app/api/v1/ai/chats/[chatId]/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiChats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserSession } from '@/app/actions';
import { z } from 'zod';

const chatUpdateSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
});

export async function PUT(request: NextRequest, { params }: { params: { chatId: string } }) {
    try {
        const session = await getUserSession();
        if (!session.user?.id) {
            return NextResponse.json({ error: 'Utilizador não autenticado.' }, { status: 401 });
        }
        const userId = session.user.id;

        const { chatId } = params;
        const body = await request.json();
        const parsed = chatUpdateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        
        const [updatedChat] = await db.update(aiChats)
            .set({ title: parsed.data.title, updatedAt: new Date() })
            .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
            .returning();
            
        if (!updatedChat) {
            return NextResponse.json({ error: 'Chat não encontrado ou não pertence a este utilizador.' }, { status: 404 });
        }

        return NextResponse.json(updatedChat);

    } catch (error) {
        console.error('Erro ao atualizar chat:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { chatId: string } }) {
    try {
        const session = await getUserSession();
        if (!session.user?.id) {
            return NextResponse.json({ error: 'Utilizador não autenticado.' }, { status: 401 });
        }
        const userId = session.user.id;
        
        const { chatId } = params;

        // O onDelete: 'cascade' no schema irá apagar as mensagens associadas
        const result = await db.delete(aiChats)
            .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Chat não encontrado ou não pertence a este utilizador.' }, { status: 404 });
        }
        
        return new NextResponse(null, { status: 204 });

    } catch (error) {
         console.error('Erro ao excluir chat:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
