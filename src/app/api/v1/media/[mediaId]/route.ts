// src/app/api/v1/media/[mediaId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { deleteFileFromS3 } from '@/lib/s3';

// DELETE /api/v1/media/[mediaId] - Delete media asset
export async function DELETE(request: NextRequest, { params }: { params: { mediaId: string } }) {
    try {
        const companyId = await getCompanyIdFromSession();
        const { mediaId } = params;

        const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
        if (!asset || asset.companyId !== companyId) {
            return NextResponse.json({ error: 'Mídia não encontrada.' }, { status: 404 });
        }

        // Delete from S3 first
        await deleteFileFromS3(asset.s3Key);
        
        // Delete from database
        await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));

        return NextResponse.json({ success: true, message: 'Mídia deletada com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar mídia:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}