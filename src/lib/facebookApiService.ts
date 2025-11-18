// src/lib/facebookApiService.ts
'use server';

import { db } from '@/lib/db';
import { connections } from './db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto';
import * as CircuitBreaker from './circuit-breaker';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v20.0';

interface SendTemplateArgs {
    connectionId?: string;
    connection?: typeof connections.$inferSelect;
    to: string;
    templateName: string;
    languageCode: string;
    components: Record<string, unknown>[];
}

export async function sendWhatsappTemplateMessage({
    connectionId,
    connection: providedConnection,
    to,
    templateName,
    languageCode,
    components,
}: SendTemplateArgs): Promise<Record<string, unknown>> {

    // Verifica circuit breaker para Meta API
    if (CircuitBreaker.isOpen('meta')) {
        const stats = CircuitBreaker.getStats('meta');
        const resetIn = stats.openUntil ? Math.ceil((stats.openUntil - Date.now()) / 1000) : 0;
        throw new Error(`Meta API circuit breaker está ABERTO. Tente novamente em ${resetIn}s.`);
    }

    let connection: typeof connections.$inferSelect;
    
    if (providedConnection) {
        connection = providedConnection;
    } else if (connectionId) {
        const [fetchedConnection] = await db.select().from(connections).where(eq(connections.id, connectionId));
        if (!fetchedConnection) {
            throw new Error(`Conexão com ID ${connectionId} não encontrada.`);
        }
        connection = fetchedConnection;
    } else {
        throw new Error('Nem connectionId nem connection foram fornecidos.');
    }

    if (!connection.accessToken) {
        throw new Error(`Token de acesso não configurado para a conexão ${connection.config_name}`);
    }
    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
        throw new Error(`Falha ao desencriptar o token de acesso para a conexão ${connection.config_name}`);
    }

    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}/messages`;
    
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode,
            },
            components,
        },
    };

    if (process.env.NODE_ENV !== 'production') console.debug(`[Facebook API] Enviando payload para ${to}:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // Timeout de 15s
    });

    const responseData = await response.json() as { error?: { message: string }};

    if (!response.ok) {
        console.error(`[Facebook API] Erro para ${to}:`, JSON.stringify(responseData, null, 2));
        
        // Registra falha no circuit breaker
        CircuitBreaker.recordFailure('meta');
        
        const error = new Error(responseData.error?.message || 'Falha ao enviar mensagem de modelo via WhatsApp.');
        // Propaga status HTTP para permitir retry logic detectar erros transientes (5xx, 429)
        Object.assign(error, { code: response.status, response: { status: response.status } });
        throw error;
    }

    // Registra sucesso no circuit breaker
    CircuitBreaker.recordSuccess('meta');

    if (process.env.NODE_ENV !== 'production') console.debug(`[Facebook API] Sucesso para ${to}. Resposta:`, JSON.stringify(responseData, null, 2));
    return responseData;
}


interface SendTextArgs {
    connectionId: string;
    to: string;
    text: string;
}

export async function sendWhatsappTextMessage({ connectionId, to, text }: SendTextArgs): Promise<Record<string, unknown>> {
    const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));
    if (!connection) {
        throw new Error(`Conexão com ID ${connectionId} não encontrada.`);
    }

    if (!connection.accessToken) {
        throw new Error(`Token de acesso não configurado para a conexão ${connection.config_name}`);
    }
    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
        throw new Error(`Falha ao desencriptar o token de acesso para a conexão ${connection.config_name}`);
    }

    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}/messages`;
    
    // CORREÇÃO: A API espera um objeto 'text' com uma propriedade 'body'
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
            body: text,
            preview_url: true, 
        },
    };

    if (process.env.NODE_ENV !== 'production') console.debug('[Facebook API - Text] Enviando payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000), // Timeout de 15s
    });

    const responseData = await response.json() as { error?: { message: string }};

    if (!response.ok) {
        console.error(`[Facebook API - Text] Erro para ${to}:`, JSON.stringify(responseData, null, 2));
        const error = new Error(responseData.error?.message || 'Falha ao enviar mensagem de texto via WhatsApp.');
        // Propaga status HTTP para permitir retry logic detectar erros transientes (5xx, 429)
        Object.assign(error, { code: response.status, response: { status: response.status } });
        throw error;
    }

    console.log(`[Facebook API - Text] Sucesso para ${to}.`);
    return responseData;
}


export async function getMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
    try {
        const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${mediaId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(15000), // Timeout de 15s
        });
        const data = await response.json() as { url?: string; error?: { message: string } };
        if (!response.ok) {
            console.error(`[Facebook API - Media URL] Erro para mediaId ${mediaId}:`, data);
            return null;
        }
        return data.url || null;
    } catch (error) {
        console.error(`[Facebook API - Media URL] Falha crítica ao buscar URL da mídia ${mediaId}:`, error);
        return null;
    }
}
