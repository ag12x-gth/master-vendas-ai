// src/app/api/v1/auth/login/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { withRateLimit } from '@/middleware/rate-limit.middleware';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Senha é obrigatória.'),
});

const getJwtSecretKey = () => {
    const secret = process.env.JWT_SECRET_KEY_CALL;
    if (!secret) {
        throw new Error('JWT_SECRET_KEY_CALL não está definida nas variáveis de ambiente.');
    }
    return new TextEncoder().encode(secret);
};

async function handler(request: NextRequest) {
    try {
        // Suporta JSON e form-urlencoded (fallback quando JS falha)
        const contentType = request.headers.get('content-type') || '';
        let body: Record<string, unknown>;
        
        if (contentType.includes('application/x-www-form-urlencoded')) {
            // Form submission fallback (quando JS não carrega)
            const formData = await request.formData();
            body = {
                email: formData.get('email'),
                password: formData.get('password'),
            };
        } else {
            // JSON submission (padrão)
            body = await request.json();
        }
        
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados de login inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }

        const { email, password } = parsed.data;

        // 1. Encontrar o utilizador pelo e-mail (convertido para minúsculas)
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (!user || !user.password) {
            return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
        }
        
        // 2. Comparar a senha fornecida com o hash guardado
        const isPasswordValid = await compare(password, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
        }

        // Verificar se o email está verificado (desativado para teste - remove esta linha em produção)
        // if (!user.emailVerified) {
        //   return NextResponse.json({ error: 'Confirmação de NÃO-ROBÔ! 🤖\nTe enviei um e-mail para confirmar que é você mesmo, e não uma IA ;D', user }, { status: 403 });
        // }
        
        // 3. Gerar um timestamp único para este login (ajuda a invalidar sessões anteriores)
        const loginTimestamp = Math.floor(Date.now() / 1000);
        
        // 4. Gerar o token JWT para a nossa sessão interna
        const token = await new SignJWT({
            userId: user.id,
            companyId: user.companyId,
            email: user.email,
            role: user.role,
            loginTime: loginTimestamp, // Adiciona timestamp do login
        })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d') // Expira em 1 dia
        .sign(getJwtSecretKey());

        // Configuração dos cookies
        const cookieOptions = {
            name: '__session',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const, 
            path: '/',
            maxAge: 60 * 60 * 24, // 1 dia em segundos
        };

        // Se for form submission (fallback), redireciona com cookies
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const redirectUrl = new URL('/super-admin', request.url);
            const response = NextResponse.redirect(redirectUrl, { status: 303 });
            response.cookies.delete('__session');
            response.cookies.delete('session_token');
            response.cookies.set(cookieOptions);
            response.cookies.set({ ...cookieOptions, name: 'session_token' });
            return response;
        }

        // JSON response (padrão quando JS funciona)
        const response = NextResponse.json({ 
            success: true, 
            message: 'Login bem-sucedido.',
            loginTime: loginTimestamp
        });
        
        // Limpar cookies existentes primeiro
        response.cookies.delete('__session');
        response.cookies.delete('session_token');
        
        response.cookies.set(cookieOptions);
        response.cookies.set({ ...cookieOptions, name: 'session_token' });

        return response;

    } catch (error) {
        console.error('Erro no endpoint de login:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        return NextResponse.json({ error: 'Erro interno do servidor.', details: errorMessage }, { status: 500 });
    }
}

// Apply rate limiting to the POST handler

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export const POST = withRateLimit(handler);
