// src/app/api/v1/team/invite/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db, users, emailVerificationTokens } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { sendEmailVerificationLink } from '@/lib/email';
import { getCompanyIdFromSession } from '@/app/actions';

const inviteSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  role: z.enum(['admin', 'atendente']),
});

// Helper para criar uma data de expiração (ex: em 24 horas)
const createExpirationDate = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

export async function POST(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        
        const parsed = inviteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados de convite inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        const { name, email, role } = parsed.data;
        
        const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
        if (existingUser && existingUser.companyId === companyId) {
            return NextResponse.json({ error: 'Este utilizador já pertence à sua equipa.' }, { status: 409 });
        }
        if (existingUser) {
            return NextResponse.json({ error: 'Este endereço de e-mail já está em uso por outra conta.' }, { status: 409 });
        }

        const temporaryPassword = randomBytes(16).toString('hex');
        const passwordHash = await hash(temporaryPassword, 10);

        const [invitedUser] = await db.insert(users).values({
            email: email.toLowerCase(),
            name: name,
            password: passwordHash,
            firebaseUid: `native_${randomUUID()}`,
            role: role,
            companyId: companyId,
            emailVerified: null,
        }).returning({ id: users.id, name: users.name, email: users.email });

        if (!invitedUser) {
          throw new Error("Falha ao criar o utilizador convidado no banco de dados.");
        }

         const verificationToken = randomBytes(20).toString('hex');
         const tokenHash = createHash('sha256').update(verificationToken).digest('hex');
         
         await db.insert(emailVerificationTokens).values({
             userId: invitedUser.id,
             tokenHash,
             expiresAt: createExpirationDate(24)
         });

         await sendEmailVerificationLink(invitedUser.email, invitedUser.name, verificationToken);
        
        return NextResponse.json({ success: true, message: 'Utilizador convidado com sucesso.' }, { status: 201 });

    } catch (error) {
        console.error('Erro no endpoint de convite:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
