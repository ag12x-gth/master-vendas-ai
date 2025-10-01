// src/app/api/v1/connections/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';
import { encrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

const connectionSchema = z.object({
    configName: z.string().min(1, 'Nome da conexão é obrigatório'),
    connectionType: z.enum(['meta_api', 'whatsapp_qr']).optional().default('meta_api'),
    wabaId: z.string().min(1, 'WABA ID é obrigatório'),
    phoneNumberId: z.string().min(1, 'ID do telefone é obrigatório'),
    appId: z.string().min(1, 'ID do Aplicativo é obrigatório'),
    accessToken: z.string().min(1, 'Token de acesso é obrigatório'),
    appSecret: z.string().min(1, 'App Secret é obrigatório'),
});

export async function GET(_request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const companyConnections = await db
            .select({
                id: connections.id,
                companyId: connections.companyId,
                config_name: connections.config_name,
                wabaId: connections.wabaId,
                phoneNumberId: connections.phoneNumberId,
                appId: connections.appId,
                accessToken: connections.accessToken,
                webhookSecret: connections.webhookSecret,
                appSecret: connections.appSecret,
                isActive: connections.isActive,
                assignedPersonaId: connections.assignedPersonaId, // **CORREÇÃO AQUI**
                createdAt: connections.createdAt
            })
            .from(connections)
            .where(eq(connections.companyId, companyId))
            .orderBy(desc(connections.createdAt));
        
        // Retorna os dados, mas o token permanece encriptado
        return NextResponse.json(companyConnections);
    } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsedData = connectionSchema.safeParse(body);

        if (!parsedData.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsedData.error.flatten() }, { status: 400 });
        }

        const { configName, connectionType, wabaId, phoneNumberId, accessToken, appSecret, appId } = parsedData.data;

        // Encrypt sensitive data
        const encryptedAccessToken = encrypt(accessToken);
        const encryptedAppSecret = encrypt(appSecret);

        const existingConnections = await db.select({ id: connections.id }).from(connections).where(eq(connections.companyId, companyId)).limit(1);
        const isFirstConnection = existingConnections.length === 0;

        const [newConnection] = await db.insert(connections).values({
            companyId,
            config_name: configName,
            connectionType: connectionType || 'meta_api',
            wabaId,
            phoneNumberId,
            appId,
            accessToken: encryptedAccessToken,
            webhookSecret: 'placeholder', // This is now managed internally
            appSecret: encryptedAppSecret,
            isActive: isFirstConnection,
        }).returning();
        
        if (!newConnection) {
            throw new Error("Falha ao criar a conexão no banco de dados.");
        }

        const responseConnection = {
            ...newConnection,
            configName: newConnection.config_name
        }

        return NextResponse.json(responseConnection, { status: 201 });
    } catch (error) {
        console.error('Erro ao criar conexão:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
