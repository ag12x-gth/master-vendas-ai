// src/app/api/v1/ia/personas/[personaId]/sections/[sectionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/app/actions';
import { db } from '@/lib/db';
import { aiPersonas, personaPromptSections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { personaId: string; sectionId: string } }
) {
  try {
    const session = await getUserSession();
    if (session.error || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const user = session.user;

    const { personaId, sectionId } = params;

    const persona = await db
      .select()
      .from(aiPersonas)
      .where(
        and(
          eq(aiPersonas.id, personaId),
          eq(aiPersonas.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!persona.length) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
    }

    const existingSection = await db
      .select()
      .from(personaPromptSections)
      .where(
        and(
          eq(personaPromptSections.id, sectionId),
          eq(personaPromptSections.personaId, personaId)
        )
      )
      .limit(1);

    if (!existingSection.length) {
      return NextResponse.json({ error: 'Seção não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { sectionName, content, language, priority, tags } = body;

    const [updatedSection] = await db
      .update(personaPromptSections)
      .set({
        sectionName: sectionName || existingSection[0].sectionName,
        content: content || existingSection[0].content,
        language: language || existingSection[0].language,
        priority: priority !== undefined ? priority : existingSection[0].priority,
        tags: tags !== undefined ? tags : existingSection[0].tags,
        updatedAt: new Date(),
      })
      .where(eq(personaPromptSections.id, sectionId))
      .returning();

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Erro ao atualizar seção:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar seção' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { personaId: string; sectionId: string } }
) {
  try {
    const session = await getUserSession();
    if (session.error || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const user = session.user;

    const { personaId, sectionId } = params;

    const persona = await db
      .select()
      .from(aiPersonas)
      .where(
        and(
          eq(aiPersonas.id, personaId),
          eq(aiPersonas.companyId, user.companyId)
        )
      )
      .limit(1);

    if (!persona.length) {
      return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
    }

    const existingSection = await db
      .select()
      .from(personaPromptSections)
      .where(
        and(
          eq(personaPromptSections.id, sectionId),
          eq(personaPromptSections.personaId, personaId)
        )
      )
      .limit(1);

    if (!existingSection.length) {
      return NextResponse.json({ error: 'Seção não encontrada' }, { status: 404 });
    }

    await db
      .delete(personaPromptSections)
      .where(eq(personaPromptSections.id, sectionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar seção:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar seção' },
      { status: 500 }
    );
  }
}
