// src/app/objects/[...path]/route.ts
// Route to serve objects from Replit Object Storage
import { NextResponse, type NextRequest } from 'next/server';

const isReplit = () => {
    return !!(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT_ID);
}

// GET /objects/* - Serve objects from Replit Object Storage
export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    // Only serve from Replit Object Storage when running on Replit
    if (!isReplit()) {
        return NextResponse.json(
            { error: 'Object storage route only available on Replit' },
            { status: 404 }
        );
    }

    try {
        const { ObjectStorageService } = await import('../../../../server/objectStorage');
        const service = new ObjectStorageService();
        
        const objectPath = `/objects/${params.path.join('/')}`;
        
        // Get the object file
        const objectFile = await service.getObjectEntityFile(objectPath);
        
        // Get file metadata
        const [metadata] = await objectFile.getMetadata();
        
        // Create read stream
        const stream = objectFile.createReadStream();
        
        // Convert to web stream
        const webStream = new ReadableStream({
            async start(controller) {
                stream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                
                stream.on('end', () => {
                    controller.close();
                });
                
                stream.on('error', (err) => {
                    controller.error(err);
                });
            }
        });
        
        // Return response with appropriate headers
        return new NextResponse(webStream, {
            headers: {
                'Content-Type': metadata.contentType || 'application/octet-stream',
                'Content-Length': metadata.size?.toString() || '0',
                'Cache-Control': 'public, max-age=3600',
            }
        });
        
    } catch (error: any) {
        console.error('Error serving object:', error);
        
        if (error?.name === 'ObjectNotFoundError') {
            return NextResponse.json(
                { error: 'Object not found' },
                { status: 404 }
            );
        }
        
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}