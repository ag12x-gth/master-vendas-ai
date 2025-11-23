// src/app/api/auth/verify-email/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users, emailVerificationTokens, passwordResetTokens } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
});

// Helper para criar uma data de expiração
const createExpirationDate = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = verifyEmailSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Token inválido.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { token } = parsed.data;
        const tokenHash = createHash('sha256').update(token).digest('hex');

        // Encontra o token na base de dados que ainda não expirou
        const [tokenRecord] = await db
            .select()
            .from(emailVerificationTokens)
            .where(and(
                eq(emailVerificationTokens.tokenHash, tokenHash),
                gte(emailVerificationTokens.expiresAt, new Date())
            ));

        if (!tokenRecord) {
            return NextResponse.json({ error: 'Token inválido ou expirado. Por favor, solicite um novo convite.' }, { status: 400 });
        }
        
        // Invalida o token de verificação imediatamente
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenRecord.id));
        
        // Atualiza o utilizador para marcar o e-mail como verificado
        await db.update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.id, tokenRecord.userId));

        // Gera um token de redefinição de senha para que o novo utilizador possa criar sua senha
        const passwordSetupToken = randomBytes(20).toString('hex');
        const passwordTokenHash = createHash('sha256').update(passwordSetupToken).digest('hex');
        
        // Apaga tokens antigos de senha para o mesmo utilizador
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, tokenRecord.userId));
        
        // Insere o novo token para criação de senha
        await db.insert(passwordResetTokens).values({
            userId: tokenRecord.userId,
            tokenHash: passwordTokenHash,
            expiresAt: createExpirationDate(1), // Token para criar senha dura 1 hora
        });

        return NextResponse.json({ success: true, message: 'E-mail verificado com sucesso. Redirecionando para criação de senha.', passwordSetupToken });

    } catch (error) {
        console.error('Erro no endpoint de verify-email:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.', details: (error as Error).message }, { status: 500 });
    }
}
