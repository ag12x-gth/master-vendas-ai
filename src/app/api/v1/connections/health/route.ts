// src/app/api/v1/connections/health/route.ts

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
  phoneNumberId: string | null;
  isActive: boolean;
  status: 'healthy' | 'expired' | 'error' | 'inactive' | 'expiring_soon';
  lastChecked: Date;
  errorMessage?: string;
  tokenExpiresIn?: number; // dias até expiração
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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
        connectionType: connections.connectionType,
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

      // Se a conexão está ativa, verificar baseado no tipo
      if (connection.isActive) {
        try {
          // Conexões Baileys não precisam de accessToken (usam sessão de arquivo)
          // Apenas verificar Meta API connections
          if (connection.connectionType === 'baileys' || !connection.connectionType) {
            // Baileys connection - considerada saudável se ativa
            health.status = 'healthy';
          } else {
            // Meta API connection - verificar token
            if (!connection.accessToken) {
              health.status = 'error';
              health.errorMessage = 'Token de acesso não configurado';
            } else {
              const accessToken = decrypt(connection.accessToken);
              if (!accessToken) {
                health.status = 'error';
                health.errorMessage = 'Falha ao desencriptar o token de acesso';
              } else {
                // Usar debug_token para obter informações detalhadas do token
                try {
                  const debugTokenUrl = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`;
                  const debugResponse = await fetch(debugTokenUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(10000),
                  });

                  if (!debugResponse.ok) {
                    // Fallback: testar com requisição simples
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
                  } else {
                    const debugData = await debugResponse.json();
                    
                    if (debugData.data?.is_valid) {
                      // Calcular dias até expiração
                      if (debugData.data.expires_at && debugData.data.expires_at > 0) {
                        const expiresAt = debugData.data.expires_at * 1000; // Converte para ms
                        const now = Date.now();
                        const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
                        health.tokenExpiresIn = daysUntilExpiry;
                        
                        // Definir status baseado na proximidade da expiração
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
                        // Token válido mas sem data de expiração (tokens permanentes)
                        health.status = 'healthy';
                      }
                    } else {
                      health.status = 'expired';
                      health.errorMessage = 'Token inválido segundo Meta Graph API';
                    }
                  }
                } catch (error) {
                  // Em caso de erro na verificação, tentar método simples
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
              }
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
      expiring_soon: healthChecks.filter(h => h.status === 'expiring_soon').length,
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