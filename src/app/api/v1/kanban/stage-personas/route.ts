// src/app/api/v1/kanban/stage-personas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db, kanbanStagePersonas, kanbanBoards } from '@/lib/db';
import { getUserSession } from '@/app/actions';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const stagePersonaCreateSchema = z.object({
  boardId: z.string().uuid('ID do board inválido'),
  stageId: z.string().min(1, 'ID do estágio é obrigatório').nullable().optional(),
  activePersonaId: z.string().uuid('ID do agente ativo inválido').nullable().optional(),
  passivePersonaId: z.string().uuid('ID do agente passivo inválido').nullable().optional(),
});


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId é obrigatório' }, { status: 400 });
    }

    const board = await db.query.kanbanBoards.findFirst({
      where: and(
        eq(kanbanBoards.id, boardId),
        eq(kanbanBoards.companyId, session.user.companyId)
      )
    });

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 });
    }

    const stagePersonas = await db.query.kanbanStagePersonas.findMany({
      where: eq(kanbanStagePersonas.boardId, boardId),
      with: {
        activePersona: true,
        passivePersona: true,
      }
    });

    return NextResponse.json(stagePersonas);
  } catch (error) {
    console.error('[StagePersonas API] Erro ao buscar:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = stagePersonaCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: parsed.error.errors[0]?.message || 'Dados inválidos' 
      }, { status: 400 });
    }

    const board = await db.query.kanbanBoards.findFirst({
      where: and(
        eq(kanbanBoards.id, parsed.data.boardId),
        eq(kanbanBoards.companyId, session.user.companyId)
      )
    });

    if (!board) {
      return NextResponse.json({ error: 'Board não encontrado ou sem permissão' }, { status: 404 });
    }

    const existing = await db.query.kanbanStagePersonas.findFirst({
      where: parsed.data.stageId 
        ? and(
            eq(kanbanStagePersonas.boardId, parsed.data.boardId),
            eq(kanbanStagePersonas.stageId, parsed.data.stageId)
          )
        : and(
            eq(kanbanStagePersonas.boardId, parsed.data.boardId),
            isNull(kanbanStagePersonas.stageId)
          )
    });

    let result;
    if (existing) {
      [result] = await db.update(kanbanStagePersonas)
        .set({
          activePersonaId: parsed.data.activePersonaId,
          passivePersonaId: parsed.data.passivePersonaId,
        })
        .where(eq(kanbanStagePersonas.id, existing.id))
        .returning();
    } else {
      [result] = await db.insert(kanbanStagePersonas)
        .values({
          boardId: parsed.data.boardId,
          stageId: parsed.data.stageId,
          activePersonaId: parsed.data.activePersonaId,
          passivePersonaId: parsed.data.passivePersonaId,
        })
        .returning();
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('[StagePersonas API] Erro ao criar/atualizar:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const config = await db.query.kanbanStagePersonas.findFirst({
      where: eq(kanbanStagePersonas.id, id),
      with: { board: true }
    });

    const board = config?.board as { companyId: string } | null;
    if (!config || !board || board.companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Configuração não encontrada ou sem permissão' }, { status: 404 });
    }

    await db.delete(kanbanStagePersonas).where(eq(kanbanStagePersonas.id, id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[StagePersonas API] Erro ao deletar:', error);
    return NextResponse.json({ error: 'Erro ao deletar configuração' }, { status: 500 });
  }
}
