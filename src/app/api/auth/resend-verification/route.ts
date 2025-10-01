// src/app/api/auth/resend-verification/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users, emailVerificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { sendEmailVerificationLink } from '@/lib/email';
import { getCompanyIdFromSession } from '@/app/actions';
import { z } from 'zod';

const resendSchema = z.object({
  userId: z.string().uuid(),
});

// Helper para criar uma data de expiração (ex: em 24 horas)
const createExpirationDate = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

export async function POST(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession(); // Authenticates admin
        const body = await request.json();
        const parsed = resendSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'ID de utilizador inválido.' }, { status: 400 });
        }

        const { userId } = parsed.data;

        const [user] = await db.select({ id: users.id, email: users.email, name: users.name, companyId: users.companyId }).from(users).where(eq(users.id, userId));

        if (!user || user.companyId !== companyId) {
            return NextResponse.json({ error: 'Utilizador não encontrado ou não pertence a esta empresa.' }, { status: 404 });
        }
        
        // Invalidate old tokens
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, user.id));

        // Create and send a new one
        const verificationToken = randomBytes(20).toString('hex');
        const tokenHash = createHash('sha256').update(verificationToken).digest('hex');

        await db.insert(emailVerificationTokens).values({
            userId: user.id,
            tokenHash: tokenHash,
            expiresAt: createExpirationDate(24) // New token expires in 24 hours
        });

        await sendEmailVerificationLink(user.email, user.name, verificationToken);

        return NextResponse.json({ success: true, message: 'Um novo link de verificação foi enviado.' });

    } catch (error) {
        console.error('Erro ao reenviar e-mail de verificação:', error);
        if (error instanceof Error && error.message.includes("Não autorizado")) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
