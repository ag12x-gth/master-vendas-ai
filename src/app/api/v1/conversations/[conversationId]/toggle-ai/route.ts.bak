// src/app/api/v1/conversations/[conversationId]/toggle-ai/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { conversations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';

const toggleAiSchema = z.object({
  aiActive: z.boolean(),
});

export async function POST(request: NextRequest, { params }: { params: { conversationId: string } }) {
  try {
    const companyId = await getCompanyIdFromSession();
    const { conversationId } = params;

    const body = await request.json();
    const parsed = toggleAiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const [updatedConversation] = await db.update(conversations)
      .set({ aiActive: parsed.data.aiActive })
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.companyId, companyId)
      ))
      .returning();

    if (!updatedConversation) {
      return NextResponse.json({ error: 'Conversa não encontrada ou não pertence à sua empresa.' }, { status: 404 });
    }

    return NextResponse.json(updatedConversation);

  } catch (error) {
    console.error('Erro ao alternar status da IA:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
