// src/app/api/v1/media/upload-url/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { mediaAssets } from '@/lib/db/schema';
import { getCompanyIdFromSession } from '@/app/actions';
import { v4 as uuidv4 } from 'uuid';
import { uploadFileToS3 } from '@/lib/s3';
// import { convertToOgg } from '@/lib/ffmpeg';

function getFileType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    return 'DOCUMENT';
}

export async function POST(request: NextRequest) {
    const fileId = uuidv4();
    
    try {
        const companyId = await getCompanyIdFromSession();
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
        }

        // Validações de tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não suportado.' }, { status: 400 });
        }
        
        const fileType = getFileType(file.type);
        const fileExtension = file.name.split('.').pop() || 'bin';
        const finalKeyPath = `zapmaster/${companyId}/media/${fileId}.${fileExtension}`;
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const s3Url = await uploadFileToS3(finalKeyPath, fileBuffer, file.type);
        
        const [newAsset] = await db.insert(mediaAssets).values({
            id: fileId,
            companyId,
            name: file.name,
            type: fileType,
            fileSize: file.size,
            s3Key: finalKeyPath,
            s3Url: s3Url,
            mimeType: file.type,
        }).returning();

        return NextResponse.json(newAsset, { status: 201 });

    } catch (error) {
        console.error('Erro no upload de mídia:', error);
        return NextResponse.json({ error: (error as Error).message, details: (error as Error).stack }, { status: 500 });
    }
}
