// src/app/api/v1/connections/health/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { decrypt } from '@/lib/crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v20.0';
const CONNECTION_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 30000;

interface ConnectionHealth {
  id: string;
  name: string;
  phoneNumberId: string | null;
  isActive: boolean;
  status: 'healthy' | 'expired' | 'error' | 'inactive' | 'expiring_soon';
  lastChecked: Date;
  errorMessage?: string;
  tokenExpiresIn?: number;
}

interface CacheEntry {
  data: { summary: Record<string, number>; connections: ConnectionHealth[] };
  timestamp: number;
}

const healthCache = new Map<string, CacheEntry>();

type ConnectionData = {
  id: string;
  name: string;
  phoneNumberId: string | null;
  accessToken: string | null;
  connectionType: string | null;
  isActive: boolean;
  createdAt: Date | null;
};

async function checkConnectionHealth(connection: ConnectionData): Promise<ConnectionHealth> {
  const health: ConnectionHealth = {
    id: connection.id,
    name: connection.name,
    phoneNumberId: connection.phoneNumberId,
    isActive: connection.isActive,
    status: connection.isActive ? 'healthy' : 'inactive',
    lastChecked: new Date()
  };

  if (!connection.isActive) {
    return health;
  }

  try {
    if (connection.connectionType === 'baileys' || !connection.connectionType) {
      health.status = 'healthy';
      return health;
    }

    if (!connection.accessToken) {
      health.status = 'error';
      health.errorMessage = 'Token de acesso não configurado';
      return health;
    }

    const accessToken = decrypt(connection.accessToken);
    if (!accessToken) {
      health.status = 'error';
      health.errorMessage = 'Falha ao desencriptar o token de acesso';
      return health;
    }

    try {
      const debugTokenUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
      const debugResponse = await fetch(debugTokenUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
      });

      if (!debugResponse.ok) {
        const fallbackResponse = await fetch(
          `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
          }
        );

        if (!fallbackResponse.ok) {
          const errorData = await fallbackResponse.json();
          health.status = 'expired';
          health.errorMessage = errorData.error?.message || 'Token de acesso inválido ou expirado';
        }
      } else {
        const debugData = await debugResponse.json();

        if (debugData.data?.is_valid) {
          if (debugData.data.expires_at && debugData.data.expires_at > 0) {
            const expiresAt = debugData.data.expires_at * 1000;
            const now = Date.now();
            const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
            health.tokenExpiresIn = daysUntilExpiry;

            if (daysUntilExpiry < 0) {
              health.status = 'expired';
              health.errorMessage = 'Token expirado';
            } else if (daysUntilExpiry < 7) {
              health.status = 'expiring_soon';
              health.errorMessage = `Token expira em ${daysUntilExpiry} dia(s)`;
            } else {
              health.status = 'healthy';
            }
          } else {
            health.status = 'healthy';
          }
        } else {
          health.status = 'expired';
          health.errorMessage = 'Token inválido segundo Meta Graph API';
        }
      }
    } catch (fetchError) {
      const fallbackResponse = await fetch(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(CONNECTION_TIMEOUT_MS),
        }
      );

      if (!fallbackResponse.ok) {
        const errorData = await fallbackResponse.json();
        health.status = 'expired';
        health.errorMessage = errorData.error?.message || 'Token de acesso inválido ou expirado';
      }
    }
  } catch (error) {
    health.status = 'error';
    health.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao verificar conexão';
  }

  return health;
}

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();

    const cached = healthCache.get(companyId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
      });
    }

    const companyConnections = await db
      .select({
        id: connections.id,
        name: connections.config_name,
        phoneNumberId: connections.phoneNumberId,
        accessToken: connections.accessToken,
        connectionType: connections.connectionType,
        isActive: connections.isActive,
        createdAt: connections.createdAt
      })
      .from(connections)
      .where(eq(connections.companyId, companyId));

    const healthChecks = await Promise.all(
      companyConnections.map((connection) => checkConnectionHealth(connection))
    );

    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(h => h.status === 'healthy').length,
      expiring_soon: healthChecks.filter(h => h.status === 'expiring_soon').length,
      expired: healthChecks.filter(h => h.status === 'expired').length,
      error: healthChecks.filter(h => h.status === 'error').length,
      inactive: healthChecks.filter(h => h.status === 'inactive').length
    };

    const responseData = { summary, connections: healthChecks };
    healthCache.set(companyId, { data: responseData, timestamp: Date.now() });

    return NextResponse.json({ ...responseData, cached: false });

  } catch (error: any) {
    if (error?.message?.includes('Não autorizado')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    console.error('Erro ao verificar saúde das conexões:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao verificar conexões' },
      { status: 500 }
    );
  }
}
