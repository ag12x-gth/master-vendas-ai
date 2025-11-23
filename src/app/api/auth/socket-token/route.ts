import { NextResponse } from 'next/server';
import { getUserSession } from '@/app/actions';
import { SignJWT } from 'jose';

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY_CALL;


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!JWT_SECRET_KEY) {
            return NextResponse.json(
                { error: 'JWT_SECRET_KEY_CALL not configured' }, 
                { status: 500 }
            );
        }

        const session = await getUserSession();
        
        if (!session.user || session.error) {
            return NextResponse.json(
                { error: 'Not authenticated', details: session.error }, 
                { status: 401 }
            );
        }
        
        const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
        
        const socketToken = await new SignJWT({
            userId: session.user.id,
            companyId: session.user.companyId,
            email: session.user.email,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secretKey);
        
        return NextResponse.json({
            token: socketToken,
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