// src/app/api/v1/leads/[leadId]/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { kanbanLeads, kanbanBoards } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';

const leadUpdateSchema = z.object({
  stageId: z.string().optional(),
  value: z.number().optional(),
});

// PUT /api/v1/leads/[leadId]
export async function PUT(request: NextRequest, { params }: { params: { leadId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { leadId } = params;

        // First, verify the lead belongs to a board of the correct company
        const [leadVerification] = await db.select({ boardId: kanbanLeads.boardId })
            .from(kanbanLeads)
            .where(eq(kanbanLeads.id, leadId))
            .limit(1);

        if (!leadVerification) {
            return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
        }

        const [boardVerification] = await db.select({ id: kanbanBoards.id })
            .from(kanbanBoards)
            .where(and(eq(kanbanBoards.id, leadVerification.boardId), eq(kanbanBoards.companyId, companyId)))
            .limit(1);
        
        if (!boardVerification) {
            return NextResponse.json({ error: 'Lead não pertence à sua empresa.' }, { status: 403 });
        }
        
        const body = await request.json();
        const parsedData = leadUpdateSchema.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsedData.error.flatten() }, { status: 400 });
        }
        
        const updateData: { stageId?: string; value?: string } = {};
        if (parsedData.data.stageId) {
            updateData.stageId = parsedData.data.stageId;
        }
        if (parsedData.data.value !== undefined) {
            updateData.value = parsedData.data.value.toString();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar foi fornecido.' }, { status: 400 });
        }

        const [updatedLead] = await db.update(kanbanLeads)
            .set(updateData)
            .where(eq(kanbanLeads.id, leadId))
            .returning();
            
        if (!updatedLead) {
            // This case should be rare given the checks above, but good for safety
            return NextResponse.json({ error: 'Lead não encontrado ao tentar atualizar.' }, { status: 404 });
        }

        return NextResponse.json(updatedLead);
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}

// DELETE /api/v1/leads/[leadId]
export async function DELETE(request: NextRequest, { params }: { params: { leadId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { leadId } = params;

        // Verify the lead belongs to a board of the correct company before deleting
        const [leadVerification] = await db.select({ boardId: kanbanLeads.boardId })
            .from(kanbanLeads)
            .where(eq(kanbanLeads.id, leadId))
            .limit(1);

        if (!leadVerification) {
            return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
        }

        const [boardVerification] = await db.select({ id: kanbanBoards.id })
            .from(kanbanBoards)
            .where(and(eq(kanbanBoards.id, leadVerification.boardId), eq(kanbanBoards.companyId, companyId)))
            .limit(1);
        
        if (!boardVerification) {
            return NextResponse.json({ error: 'Lead não pertence à sua empresa.' }, { status: 403 });
        }
        
        await db.delete(kanbanLeads).where(eq(kanbanLeads.id, leadId));
        
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('Erro ao excluir lead:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
