// src/app/api/auth/register/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users, companies, emailVerificationTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { randomUUID, randomBytes } from 'crypto';
import { sendEmailVerificationLink } from '@/lib/email';
import { createHash } from 'crypto';

// Helper para criar uma data de expiração (ex: em 24 horas)
const createExpirationDate = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

// Este schema é APENAS para o registo de uma nova empresa/utilizador.
const registerSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse(body);
        
        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados de registo inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        
        const { name, email, password } = parsed.data;

        const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
        if (existingUser) {
            return NextResponse.json({ error: 'Já existe uma conta com este email.' }, { status: 409 });
        }

        const passwordHash = await hash(password, 10);
        
        const newUser = await db.transaction(async (tx) => {
            const [newCompany] = await tx.insert(companies).values({ name: `${name}'s Company` }).returning();
            if (!newCompany) {
              throw new Error("Falha ao criar empresa durante o registo.");
            }
            const [createdUser] = await tx.insert(users).values({
                name,
                email: email.toLowerCase(),
                password: passwordHash,
                firebaseUid: `native_${randomUUID()}`,
                role: 'admin',
                companyId: newCompany.id,
                emailVerified: null,
            }).returning({ id: users.id, name: users.name, email: users.email });

            if (!createdUser) {
                throw new Error("Falha ao criar o utilizador no banco de dados.");
            }
            return createdUser;
        });

        // Adiciona uma verificação final para garantir que a transação foi bem sucedida
        if (!newUser) {
          throw new Error("Falha ao criar o utilizador durante o registo.");
        }
        
        const verificationToken = randomBytes(20).toString('hex');
        const tokenHash = createHash('sha256').update(verificationToken).digest('hex');
        
        await db.insert(emailVerificationTokens).values({
            userId: newUser.id,
            tokenHash,
            expiresAt: createExpirationDate(24)
        });

        await sendEmailVerificationLink(newUser.email, newUser.name, verificationToken);
        return NextResponse.json({ success: true, message: 'Conta criada! Verifique seu e-mail para ativar.' }, { status: 201 });

    } catch (error) {
        console.error('Erro no endpoint de registo:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
