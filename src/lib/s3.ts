// src/lib/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Check if running on Replit
const isReplit = () => {
    return !!(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT_ID);
}

// Storage adapter interface
interface StorageAdapter {
    uploadFile(key: string, body: Buffer, contentType: string): Promise<string>;
    getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
    getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>;
    getFileUrl(key: string): string;
    deleteFile(key: string): Promise<void>;
    fileExists(key: string): Promise<boolean>;
    getFileStream(key: string): Promise<ReadableStream | NodeJS.ReadableStream>;
}

// AWS S3 Adapter
class S3Adapter implements StorageAdapter {
    private client: S3Client;
    private bucket: string;

    constructor() {
        if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error('Credenciais da AWS S3 não configuradas no ambiente.');
        }

        this.client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });

        const bucket = process.env.AWS_S3_BUCKET_NAME;
        if (!bucket) throw new Error("AWS_S3_BUCKET_NAME não configurado.");
        this.bucket = bucket;
    }

    async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: 'max-age=31536000', // 1 ano
        });

        await this.client.send(command);
        return this.getFileUrl(key);
    }

    async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        return getSignedUrl(this.client, command, { expiresIn });
    }

    async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        return getSignedUrl(this.client, command, { expiresIn });
    }

    getFileUrl(key: string): string {
        const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
        if (cdnDomain) return `https://${cdnDomain}/${key}`;
        return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
        await this.client.send(command);
    }

    async fileExists(key: string): Promise<boolean> {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        } catch {
            return false;
        }
    }

    async getFileStream(key: string): Promise<ReadableStream> {
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
        const response = await this.client.send(command);
        return response.Body as ReadableStream;
    }

    getClient(): S3Client {
        return this.client;
    }

    getBucketName(): string {
        return this.bucket;
    }
}

// Replit Object Storage Adapter
class ReplitStorageAdapter implements StorageAdapter {
    private service: any; // Will be dynamically imported

    private async getService() {
        if (!this.service) {
            const { ObjectStorageService } = await import('../../server/objectStorage');
            this.service = new ObjectStorageService();
        }
        return this.service;
    }

    async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
        const service = await this.getService();
        const url = await service.uploadFile(key, body, contentType);
        // Convert Replit path to full URL if needed
        if (url.startsWith('/objects/')) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
            return `${baseUrl}${url}`;
        }
        return url;
    }

    async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
        const service = await this.getService();
        return service.getPresignedUploadUrl(key, contentType, expiresIn);
    }

    async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
        const service = await this.getService();
        return service.getPresignedDownloadUrl(key, expiresIn);
    }

    getFileUrl(key: string): string {
        // Return path that will be served by Replit Object Storage
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
        return `${baseUrl}/objects/${key}`;
    }

    async deleteFile(key: string): Promise<void> {
        const service = await this.getService();
        await service.deleteFile(key);
    }

    async fileExists(key: string): Promise<boolean> {
        const service = await this.getService();
        return service.fileExists(key);
    }

    async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
        const service = await this.getService();
        return service.getFileStream(key);
    }
}

// Factory function to get the appropriate storage adapter
let storageAdapter: StorageAdapter | null = null;

function getStorageAdapter(): StorageAdapter {
    if (!storageAdapter) {
        if (isReplit()) {
            console.log('Using Replit Object Storage');
            storageAdapter = new ReplitStorageAdapter();
        } else {
            console.log('Using AWS S3 Storage');
            storageAdapter = new S3Adapter();
        }
    }
    return storageAdapter;
}

// Legacy exports for backward compatibility
const getS3Client = (): S3Client => {
    if (!isReplit()) {
        const adapter = getStorageAdapter() as S3Adapter;
        return adapter.getClient();
    }
    throw new Error('S3Client não disponível no ambiente Replit. Use as funções exportadas.');
}

const _getBucket = (): string => {
    if (!isReplit()) {
        const adapter = getStorageAdapter() as S3Adapter;
        return adapter.getBucketName();
    }
    throw new Error('Bucket S3 não disponível no ambiente Replit.');
}

// Unified functions that work with both storage systems
async function uploadFileToS3(key: string, body: Buffer, contentType: string): Promise<string> {
    const adapter = getStorageAdapter();
    return adapter.uploadFile(key, body, contentType);
}

async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
    const adapter = getStorageAdapter();
    return adapter.getPresignedUploadUrl(key, contentType, expiresIn);
}

async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const adapter = getStorageAdapter();
    return adapter.getPresignedDownloadUrl(key, expiresIn);
}

function getFileUrl(key: string): string {
    const adapter = getStorageAdapter();
    return adapter.getFileUrl(key);
}

async function deleteFileFromS3(key: string): Promise<void> {
    const adapter = getStorageAdapter();
    return adapter.deleteFile(key);
}

async function fileExists(key: string): Promise<boolean> {
    const adapter = getStorageAdapter();
    return adapter.fileExists(key);
}

async function getFileStream(key: string): Promise<ReadableStream | NodeJS.ReadableStream> {
    const adapter = getStorageAdapter();
    return adapter.getFileStream(key);
}

export { 
    getS3Client, 
    uploadFileToS3, 
    getPresignedUploadUrl,
    getPresignedDownloadUrl,
    getFileUrl,
    deleteFileFromS3,
    fileExists,
    getFileStream
};