
'use server';

import type { UserWithCompany } from '@/lib/types';
import { db } from '@/lib/db';
import { users, connections, companies, passwordResetTokens, whatsappQrSessions } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import redis from '@/lib/redis';
import { decrypt } from '@/lib/crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { z } from 'zod';

// ==========================================
// SESSION / AUTH UTILS
// ==========================================

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET_KEY) {
    throw new Error('JWT_SECRET_KEY não está definida nas variáveis de ambiente.');
}
const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);


export async function getUserSession(): Promise<{ user: UserWithCompany | null, error?: string, errorCode?: string }> {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('__session')?.value || cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
        return { user: null, error: 'Token de sessão não encontrado.', errorCode: 'token_nao_encontrado' };
    }
    
    try {
        // Verificar se o token está bem formado
        if (!sessionToken.includes('.') || sessionToken.split('.').length !== 3) {
            return { user: null, error: 'Formato de token inválido.', errorCode: 'token_invalido' };
        }

        const { payload } = await jwtVerify(sessionToken, secretKey);
        
        if (!payload || !payload.userId) {
            return { user: null, error: 'Payload do token inválido.', errorCode: 'token_invalido' };
        }

        const userId = payload.userId as string;
        const tokenCompanyId = payload.companyId as string;

        const results = await db
            .select({
                user: users,
                company: companies
            })
            .from(users)
            .leftJoin(companies, eq(users.companyId, companies.id))
            .where(eq(users.id, userId))
            .limit(1);

        if (results.length === 0 || !results[0]) {
             return { user: null, error: 'Utilizador da sessão não encontrado na base de dados.', errorCode: 'usuario_nao_encontrado' };
        }
        
        const { user: userWithPassword, company } = results[0];
        
        // Verificar se o companyId do token corresponde ao do usuário no banco
        if (tokenCompanyId && userWithPassword.companyId !== tokenCompanyId) {
            return { user: null, error: 'Inconsistência de empresa na sessão.', errorCode: 'token_invalido' };
        }
        
        const { password, ...userWithoutPassword } = userWithPassword;

        return { user: { ...userWithoutPassword, company: company || null } };

    } catch (error: any) {
        let errorCode = 'token_invalido';
        let errorMessage = 'Falha na verificação do token';
        
        if (error.code === 'ERR_JWT_EXPIRED') {
            errorCode = 'token_expirado';
            errorMessage = 'Token de sessão expirado';
        } else if (error.code === 'ERR_JWT_INVALID') {
            errorCode = 'token_invalido';
            errorMessage = 'Token de sessão inválido';
        } else if (error.message?.includes('Invalid key')) {
            errorCode = 'token_invalido';
            errorMessage = 'Chave de verificação inválida';
        }
        
        return { user: null, error: `${errorMessage}: ${error.message}`, errorCode };
    }
}


export async function getCompanyIdFromSession(): Promise<string> {
    const session = await getUserSession();
    if (session.error || !session.user?.companyId) {
        throw new Error("Não autorizado: ID da empresa não pôde ser obtido da sessão.");
    }
    return session.user.companyId;
}

export async function getUserIdFromSession(): Promise<string> {
     const session = await getUserSession();
    if (session.error || !session.user?.id) {
        throw new Error("Não autorizado: ID do utilizador não pôde ser obtido da sessão.");
    }
    return session.user.id;
}


// ==========================================
// PASSWORD RECOVERY ACTION
// ==========================================

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido.'),
});

const createExpirationDate = (minutes: number): Date => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
        const parsed = forgotPasswordSchema.safeParse({ email });

        if (!parsed.success) {
            return { success: false, message: 'Email inválido.' };
        }

        const [user] = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.email, email.toLowerCase()));

        if (user) {
            const token = randomBytes(20).toString('hex');
            const tokenHash = createHash('sha256').update(token).digest('hex');

            await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
            
            await db.insert(passwordResetTokens).values({
                userId: user.id,
                tokenHash: tokenHash,
                expiresAt: createExpirationDate(15), 
            });

            await sendPasswordResetEmail(user.email, user.name || 'Utilizador', token);
        }

        // Always return a success-like message to prevent user enumeration
        return { success: true, message: 'Se o e-mail estiver registado, um link de recuperação foi enviado.' };

    } catch (error) {
        console.error('Erro ao solicitar recuperação de senha:', error);
        return { success: false, message: 'Ocorreu um erro interno. Tente novamente mais tarde.' };
    }
}


// ==========================================
// CONNECTION ACTIONS
// ==========================================

export async function checkConnectionStatus(connectionId: string): Promise<{ success: boolean }> {
    try {
      const [conn] = await db.select().from(connections).where(eq(connections.id, connectionId));
      if (!conn) {
        console.error(`[Connection Check] Connection not found: ${connectionId}`);
        return { success: false };
      }
      
      // Se for conexão WhatsApp QR, verificar status pela sessão
      if (conn.connectionType === 'whatsapp_qr') {
        try {
          const [session] = await db.select()
            .from(whatsappQrSessions)
            .where(eq(whatsappQrSessions.connectionId, connectionId))
            .limit(1);
          
          return { success: session?.isActive || false };
        } catch (error) {
          console.error(`[Connection Check] Error checking WhatsApp QR session for ${connectionId}:`, error);
          return { success: false };
        }
      }
      
      // Para conexões Meta API, tentar decriptar o token
      let accessToken: string | null = null;
      try {
        accessToken = decrypt(conn.accessToken);
      } catch (decryptError: any) {
        console.error(`[Connection Check] Failed to decrypt token for connection ${connectionId}:`, {
          error: decryptError.message,
          code: decryptError.code,
          connectionType: conn.connectionType
        });
        
        // Se for erro de decriptação de conexão Meta API antiga/corrompida
        if (conn.connectionType === 'meta_api') {
          console.warn(`[Connection Check] Marking corrupted Meta API connection as inactive: ${connectionId}`);
          
          // Marcar conexão como inativa ao invés de deletar (mais seguro)
          try {
            await db.update(connections)
              .set({ 
                isActive: false
              })
              .where(eq(connections.id, connectionId));
          } catch (updateError) {
            console.error(`[Connection Check] Failed to update corrupted connection:`, updateError);
          }
        }
        
        // Retornar como desconectado para permitir reconexão
        return { success: false };
      }
      
      // Se não conseguiu decriptar, retornar erro
      if (!accessToken) {
        console.error(`[Connection Check] No access token available for connection ${connectionId}`);
        return { success: false };
      }

      // Verificar com a API da Meta
      const response = await fetch(`https://graph.facebook.com/v20.0/${conn.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const success = response.ok;
      if (!success) {
        console.warn(`[Connection Check] Meta API check failed for ${connectionId}: ${response.status} ${response.statusText}`);
      }
      
      return { success };
    } catch (error: any) {
      console.error(`[Connection Check] Unexpected error for ${connectionId}:`, {
        message: error.message,
        stack: error.stack
      });
      return { success: false };
    }
}
  
export async function toggleConnectionActive(connectionId: string, isActive: boolean): Promise<void> {
    await db
      .update(connections)
      .set({ isActive })
      .where(eq(connections.id, connectionId));
    revalidatePath('/connections');
}

// ==========================================
// SYSTEM TEST ACTIONS
// ==========================================

export type TestResult = {
  success: boolean;
  message: string;
  details?: string;
};

async function runDatabaseTest(): Promise<TestResult> {
  try {
    const result: any[] = await db.execute(sql`SELECT 1 as connection_status;`);
    if (result && result[0]?.connection_status === 1) {
      return {
        success: true,
        message: 'Conexão com PostgreSQL bem-sucedida.',
        details: `A query "SELECT 1" foi executada com sucesso.`,
      };
    } else {
      throw new Error('A query de verificação não retornou o resultado esperado.');
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Falha na conexão com PostgreSQL.',
      details: error.message,
    };
  }
}

async function runRedisTest(): Promise<TestResult> {
    try {
        const reply = await redis.ping();
        if (reply === 'PONG') {
             return {
                success: true,
                message: 'Conexão com Redis bem-sucedida.',
                details: 'O servidor Redis respondeu com "PONG".'
            };
        } else {
             throw new Error(`Resposta inesperada do Redis: ${reply}`);
        }
    } catch (error: any) {
        return {
            success: false,
            message: 'Falha na conexão com Redis.',
            details: error.message
        };
    }
}

async function runMetaApiTest(): Promise<TestResult> {
    try {
        const companyId = await getCompanyIdFromSession().catch(() => null);
        if (!companyId) {
             return { success: false, message: 'Não foi possível obter o ID da empresa da sessão.', details: 'Faça login para executar este teste.' };
        }

        const [firstActiveConnection] = await db
            .select()
            .from(connections)
            .where(and(eq(connections.companyId, companyId), eq(connections.isActive, true)))
            .limit(1);

        if (!firstActiveConnection) {
            return { success: false, message: 'Nenhuma conexão ativa encontrada para testar.', details: 'Ative pelo menos uma conexão no painel de administração para realizar este teste.' };
        }

        const { phoneNumberId, accessToken } = firstActiveConnection;
        const decryptedToken = decrypt(accessToken);
        if (!decryptedToken) {
            throw new Error('Falha ao desencriptar o token de acesso da conexão ativa.');
        }

        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${decryptedToken}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data?.error?.message || `Status: ${response.status}`;
            throw new Error(errorMessage);
        }

        return {
            success: true,
            message: 'Conexão com a API da Meta bem-sucedida.',
            details: `A conexão "${firstActiveConnection.config_name}" respondeu com sucesso.`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: 'Falha na conexão com a API da Meta.',
            details: error.message,
        };
    }
}

export type AllTestsResult = {
    db: TestResult;
    redis: TestResult;
    meta: TestResult;
}

export async function runAllSystemTests(): Promise<AllTestsResult> {
    const [dbResult, redisResult, metaResult] = await Promise.all([
        runDatabaseTest(),
        runRedisTest(),
        runMetaApiTest()
    ]);
    return { db: dbResult, redis: redisResult, meta: metaResult };
}
