// src/app/api/v1/auth/verify-email/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db, users, emailVerificationTokens, passwordResetTokens } from '@/lib/db';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { randomBytes, createHash, randomUUID } from 'crypto';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
});

const createExpirationDate = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const requestId = randomUUID().slice(0, 8);
    console.log(`[VERIFY-V1:${requestId}] Iniciando verificação de email...`);
    
    try {
        const body = await request.json();
        const parsed = verifyEmailSchema.safeParse(body);

        if (!parsed.success) {
            console.log(`[VERIFY-V1:${requestId}] Validação falhou:`, parsed.error.flatten());
            return NextResponse.json({ error: 'Token inválido.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { token } = parsed.data;
        const tokenHash = createHash('sha256').update(token).digest('hex');
        
        console.log(`[VERIFY-V1:${requestId}] Token recebido: ${token.slice(0, 8)}...`);
        console.log(`[VERIFY-V1:${requestId}] Token hash calculado: ${tokenHash.slice(0, 16)}...`);

        const [tokenRecord] = await db
            .select()
            .from(emailVerificationTokens)
            .where(and(
                eq(emailVerificationTokens.tokenHash, tokenHash),
                gte(emailVerificationTokens.expiresAt, new Date())
            ));

        if (!tokenRecord) {
            console.log(`[VERIFY-V1:${requestId}] Token não encontrado ou expirado`);
            
            const [expiredToken] = await db
                .select()
                .from(emailVerificationTokens)
                .where(eq(emailVerificationTokens.tokenHash, tokenHash));
            
            if (expiredToken) {
                console.log(`[VERIFY-V1:${requestId}] Token existe mas expirou em: ${expiredToken.expiresAt}`);
            } else {
                console.log(`[VERIFY-V1:${requestId}] Token não existe na base de dados`);
            }
            
            return NextResponse.json({ error: 'Token inválido ou expirado. Por favor, solicite um novo convite.' }, { status: 400 });
        }
        
        console.log(`[VERIFY-V1:${requestId}] Token encontrado para userId: ${tokenRecord.userId}`);
        console.log(`[VERIFY-V1:${requestId}] Token hash na DB: ${tokenRecord.tokenHash.slice(0, 16)}...`);
        
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, tokenRecord.id));
        console.log(`[VERIFY-V1:${requestId}] Token invalidado (removido da DB)`);
        
        await db.update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.id, tokenRecord.userId));
        console.log(`[VERIFY-V1:${requestId}] Email marcado como verificado`);

        const passwordSetupToken = randomBytes(20).toString('hex');
        const passwordTokenHash = createHash('sha256').update(passwordSetupToken).digest('hex');
        
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, tokenRecord.userId));
        
        await db.insert(passwordResetTokens).values({
            userId: tokenRecord.userId,
            tokenHash: passwordTokenHash,
            expiresAt: createExpirationDate(1),
        });
        
        console.log(`[VERIFY-V1:${requestId}] ✅ Verificação concluída com sucesso`);

        return NextResponse.json({ 
            success: true, 
            message: 'E-mail verificado com sucesso. Redirecionando para criação de senha.', 
            passwordSetupToken,
            requestId
        });

    } catch (error) {
        console.error(`[VERIFY-V1:${requestId}] Erro no endpoint de verify-email:`, error);
        return NextResponse.json({ error: 'Erro interno do servidor.', details: (error as Error).message }, { status: 500 });
    }
}
