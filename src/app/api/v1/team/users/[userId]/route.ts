// src/app/api/v1/team/users/[userId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db, users, emailVerificationTokens, passwordResetTokens } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { jwtVerify } from 'jose';

const getJwtSecretKey = () => {
    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) {
        throw new Error('JWT_SECRET_KEY não está definida nas variáveis de ambiente.');
    }
    return new TextEncoder().encode(secret);
};

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { userId: userIdToDelete } = params;

        // Fetch the user ID from the session token to prevent self-deletion
        const sessionToken = request.cookies.get('__session')?.value || request.cookies.get('session_token')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
        }

        const { payload } = await jwtVerify(sessionToken, getJwtSecretKey());
        const adminUserId = payload.userId as string;

        if (!adminUserId) {
            return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
        }

        if (adminUserId === userIdToDelete) {
            return NextResponse.json({ error: 'Você não pode remover a si mesmo da equipe.' }, { status: 403 });
        }
        
        await db.transaction(async (tx) => {
            // Check if the user to be deleted belongs to the same company
            const [user] = await tx.select({ id: users.id })
                .from(users)
                .where(and(eq(users.id, userIdToDelete), eq(users.companyId, companyId)));
                
            if (!user) {
                // This will cause the transaction to rollback
                throw new Error('Utilizador não encontrado ou não pertence à sua empresa.');
            }

            // Delete dependent records first to avoid foreign key violation
            await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userIdToDelete));
            await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userIdToDelete));

            // Now, it's safe to delete the user
            await tx.delete(users).where(eq(users.id, userIdToDelete));
        });
        
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('Erro ao remover utilizador:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        return NextResponse.json({ error: `Erro interno do servidor: ${errorMessage}` }, { status: 500 });
    }
}
