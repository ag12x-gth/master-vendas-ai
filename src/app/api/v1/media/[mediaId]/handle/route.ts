// src/app/api/v1/media/[mediaId]/handle/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets, connections, type MetaHandle } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { z } from 'zod';
import { getCompanyIdFromSession } from '@/app/actions';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v20.0';

const requestSchema = z.object({
    connectionId: z.string().uuid("ID da conexão é inválido."),
});

// POST /api/v1/media/[mediaId]/handle - Get or refresh Meta media handle
export async function POST(request: NextRequest, { params }: { params: { mediaId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
        }
        
        const { connectionId } = parsed.data;
        const { mediaId } = params;

        const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
        if (!asset || asset.companyId !== companyId) {
            return NextResponse.json({ error: 'Ativo de mídia não encontrado.' }, { status: 404 });
        }

        const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));
        if (!connection || connection.companyId !== companyId) {
            return NextResponse.json({ error: 'Conexão não encontrada.' }, { status: 404 });
        }
        
        const wabaId = connection.wabaId;

        const existingHandles = (asset.metaHandles || []) as MetaHandle[];
        const existingHandle = existingHandles.find(h => h.wabaId === wabaId);
        if (existingHandle) {
            return NextResponse.json({ success: true, handle: existingHandle.handle, message: 'Handle existente reutilizado.' });
        }

        const accessToken = decrypt(connection.accessToken);
        if (!accessToken) throw new Error("Falha ao desencriptar o token de acesso.");
        
        // Usar presigned URL para acesso seguro
        const { getPresignedDownloadUrl } = await import('@/lib/s3');
        const presignedUrl = await getPresignedDownloadUrl(asset.s3Key, 300);
        
        const fileResponse = await fetch(presignedUrl);
        if (!fileResponse.ok) {
            throw new Error(`Falha ao buscar ficheiro: ${fileResponse.statusText}`);
        }
        
        const fileBuffer = await fileResponse.arrayBuffer();
        const uploadUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}/media`;
        
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        const fileBlob = new Blob([fileBuffer], { type: asset.mimeType || 'application/octet-stream' });
        formData.append('file', fileBlob, asset.name);

        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                // NÃO defina o Content-Type aqui. A API fetch fará isso automaticamente para multipart/form-data.
            },
            body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
            console.error('Meta Media Upload Error:', uploadData);
            throw new Error(uploadData.error?.message || 'Falha ao fazer upload da mídia para a Meta.');
        }

        const handle = uploadData.id;
        if (!handle) {
            throw new Error('Não foi possível obter o media handle da resposta da Meta.');
        }

        const newHandle: MetaHandle = { wabaId, handle, createdAt: new Date().toISOString() };
        const updatedHandles = [...existingHandles, newHandle];

        await db.update(mediaAssets)
            .set({ metaHandles: updatedHandles })
            .where(eq(mediaAssets.id, mediaId));

        return NextResponse.json({ success: true, handle, message: 'Media handle criado com sucesso.' });

    } catch (error) {
        console.error('Erro ao processar media handle:', error);
        return NextResponse.json({ error: (error as Error).message, details: (error as Error).stack }, { status: 500 });
    }
}
