import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserSession } from '@/app/actions';

export async function GET() {
    try {
        // Verificar se o usuário está autenticado usando a função existente
        const session = await getUserSession();
        
        if (!session.user || session.error) {
            return NextResponse.json(
                { error: 'Not authenticated', details: session.error }, 
                { status: 401 }
            );
        }
        
        // Pegar o token do cookie (server-side pode acessar httpOnly cookies)
        const cookieStore = cookies();
        const token = cookieStore.get('__session')?.value || cookieStore.get('session_token')?.value;
        
        if (!token) {
            return NextResponse.json(
                { error: 'Token not found in cookies' }, 
                { status: 401 }
            );
        }
        
        // Retornar o token junto com informações básicas da sessão
        return NextResponse.json({
            token,
            userId: session.user.id,
            companyId: session.user.companyId,
            email: session.user.email
        });
        
    } catch (error) {
        console.error('Error getting socket token:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}