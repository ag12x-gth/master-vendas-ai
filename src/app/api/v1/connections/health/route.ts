// src/app/api/v1/connections/health/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCompanyIdFromSession } from '@/app/actions';
import { decrypt } from '@/lib/crypto';

const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || 'v20.0';

interface ConnectionHealth {
  id: string;
  name: string;
  phoneNumberId: string;
  isActive: boolean;
  status: 'healthy' | 'expired' | 'error' | 'inactive';
  lastChecked: Date;
  errorMessage?: string;
}

export async function GET(_request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    
    // Buscar todas as conexões da empresa
    const companyConnections = await db
      .select({
        id: connections.id,
        name: connections.config_name,
        phoneNumberId: connections.phoneNumberId,
        accessToken: connections.accessToken,
        isActive: connections.isActive,
        createdAt: connections.createdAt
      })
      .from(connections)
      .where(eq(connections.companyId, companyId));

    const healthChecks: ConnectionHealth[] = [];

    // Verificar cada conexão
    for (const connection of companyConnections) {
      const health: ConnectionHealth = {
        id: connection.id,
        name: connection.name,
        phoneNumberId: connection.phoneNumberId,
        isActive: connection.isActive,
        status: connection.isActive ? 'healthy' : 'inactive',
        lastChecked: new Date()
      };

      // Se a conexão está ativa, verificar o token
      if (connection.isActive) {
        try {
          const accessToken = decrypt(connection.accessToken);
          if (!accessToken) {
            health.status = 'error';
            health.errorMessage = 'Falha ao desencriptar o token de acesso';
          } else {
            // Testar o token com a API do Facebook
            const response = await fetch(`https://graph.facebook.com/${FACEBOOK_API_VERSION}/${connection.phoneNumberId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              health.status = 'expired';
              health.errorMessage = errorData.error?.message || 'Token de acesso inválido ou expirado';
            }
          }
        } catch (error) {
          health.status = 'error';
          health.errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao verificar conexão';
        }
      }

      healthChecks.push(health);
    }

    // Estatísticas resumidas
    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(h => h.status === 'healthy').length,
      expired: healthChecks.filter(h => h.status === 'expired').length,
      error: healthChecks.filter(h => h.status === 'error').length,
      inactive: healthChecks.filter(h => h.status === 'inactive').length
    };

    return NextResponse.json({
      summary,
      connections: healthChecks
    });

  } catch (error) {
    console.error('Erro ao verificar saúde das conexões:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao verificar conexões' },
      { status: 500 }
    );
  }
}