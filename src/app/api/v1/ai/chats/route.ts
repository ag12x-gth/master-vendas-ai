// src/app/api/v1/ai/chats/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiChats } from '@/lib/db/schema';
import { getUserSession } from '@/app/actions';
import { eq, desc } from 'drizzle-orm';

// GET /api/v1/ai/chats - List all AI chats for the user
export async function GET(_request: NextRequest) {
    try {
        const session = await getUserSession();
        const userId = session.user?.id;
        if (!userId) {
            return NextResponse.json({ error: 'Utilizador não autenticado.' }, { status: 401 });
        }

        const chats = await db.select()
            .from(aiChats)
            .where(eq(aiChats.userId, userId))
            .orderBy(desc(aiChats.updatedAt));
            
        return NextResponse.json(chats);

    } catch (error) {
        console.error('Erro ao buscar chats de IA:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}


// POST /api/v1/ai/chats - Create a new AI chat
export async function POST(_request: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session.user?.id || !session.user.companyId) {
            return NextResponse.json({ error: 'Sessão inválida para criar chat.' }, { status: 401 });
        }
        // CORREÇÃO: O campo no objeto session.user é 'id', não 'userId'.
        const { id: userId, companyId } = session.user;

        const [newChat] = await db.insert(aiChats).values({
            userId,
            companyId,
            title: 'Nova Conversa',
            personaId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        return NextResponse.json(newChat, { status: 201 });

    } catch (error) {
        console.error('Erro ao criar chat de IA:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
