import redis from './redis';

interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

const COMPANY_LIMIT = 60; // Requisições por minuto por empresa
const USER_LIMIT = 20;    // Requisições por minuto por utilizador
const IP_LIMIT = 10;      // Requisições por minuto por IP (proteção brute-force)
const AUTH_LIMIT = 5;     // Tentativas de login por IP em 15 minutos

/**
 * TRUE SLIDING WINDOW implementation usando timestamps
 * Remove timestamps expirados antes de contar e adicionar novo
 */
async function checkSlidingWindowLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  
  // Remove timestamps expirados e conta requests válidos
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart); // Remove antigos
  pipeline.zcard(key); // Conta requests na janela
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // Adiciona novo timestamp único
  pipeline.expire(key, windowSeconds); // Define TTL
  
  const results = await pipeline.exec();
  
  // results[1] é o count antes de adicionar o novo request
  const count = results?.[1]?.[1] as number || 0;
  
  // Se count >= limit, remove o timestamp que acabamos de adicionar (rollback)
  if (count >= limit) {
    await redis.zrem(key, `${now}-${Math.random()}`);
    return false;
  }
  
  return true;
}

export async function checkRateLimits(
  companyId: string,
  userId: string
): Promise<RateLimitResult> {
  const companyKey = `rate_limit:company:${companyId}`;
  const userKey = `rate_limit:user:${userId}`;

  const [companyAllowed, userAllowed] = await Promise.all([
    checkSlidingWindowLimit(companyKey, COMPANY_LIMIT, 60),
    checkSlidingWindowLimit(userKey, USER_LIMIT, 60),
  ]);

  if (!userAllowed) {
    return {
      allowed: false,
      message: `Limite de requisições do utilizador excedido (${USER_LIMIT}/min). Tente novamente em breve.`,
    };
  }

  if (!companyAllowed) {
    return {
      allowed: false,
      message: `Limite de requisições da empresa excedido (${COMPANY_LIMIT}/min). Tente novamente em breve.`,
    };
  }

  return { allowed: true };
}

/**
 * Rate limiting por IP para prevenir brute-force/DoS
 * Usado em rotas públicas (login, register, etc)
 * TRUE SLIDING WINDOW de 60 segundos
 */
export async function checkIpRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const ipKey = `rate_limit:ip:${ipAddress}`;
  const allowed = await checkSlidingWindowLimit(ipKey, IP_LIMIT, 60);

  if (!allowed) {
    return {
      allowed: false,
      message: `Limite de requisições por IP excedido (${IP_LIMIT}/min). Tente novamente em 1 minuto.`,
    };
  }

  return { allowed: true };
}

/**
 * Rate limiting para tentativas de autenticação (login/register)
 * TRUE SLIDING WINDOW de 15 minutos para prevenir brute-force em credenciais
 */
export async function checkAuthRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const authKey = `rate_limit:auth:${ipAddress}`;
  const allowed = await checkSlidingWindowLimit(authKey, AUTH_LIMIT, 900); // 900s = 15 min

  if (!allowed) {
    return {
      allowed: false,
      message: `Muitas tentativas de login. Tente novamente em 15 minutos.`,
    };
  }

  return { allowed: true };
}

/**
 * Extrai IP real da requisição considerando proxies (X-Forwarded-For, X-Real-IP)
 * Função síncrona helper para uso em middleware
 */
export function getClientIp(headers: Headers): string {
  // Tenta X-Forwarded-For primeiro (proxy reverso)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For pode ter múltiplos IPs: "client, proxy1, proxy2"
    const ips = forwardedFor.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    const firstIp = ips[0];
    if (firstIp && firstIp.length > 0) {
      return firstIp; // Primeiro IP é o cliente original
    }
  }
  
  // Fallback para X-Real-IP
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback para IP direto (desenvolvimento local)
  return '127.0.0.1';
}
