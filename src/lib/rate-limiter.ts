import redis from './redis';

interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

const COMPANY_LIMIT = 60; // Requisições por minuto por empresa
const USER_LIMIT = 20;    // Requisições por minuto por utilizador
const IP_LIMIT = 10;      // Requisições por minuto por IP (proteção brute-force)
const AUTH_LIMIT = 5;     // Tentativas de login por IP em 15 minutos

async function checkLimit(
  key: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const current = await redis.get(key);
  if (current && parseInt(current, 10) >= limit) {
    return false;
  }

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  if (!current) { // Se a chave não existe, define a expiração
    pipeline.expire(key, windowSeconds);
  }
  await pipeline.exec();
  
  return true;
}

export async function checkRateLimits(
  companyId: string,
  userId: string
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);

  const companyKey = `rate_limit:company:${companyId}:${minute}`;
  const userKey = `rate_limit:user:${userId}:${minute}`;

  const [companyAllowed, userAllowed] = await Promise.all([
    checkLimit(companyKey, COMPANY_LIMIT),
    checkLimit(userKey, USER_LIMIT),
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
 */
export async function checkIpRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);

  const ipKey = `rate_limit:ip:${ipAddress}:${minute}`;
  const allowed = await checkLimit(ipKey, IP_LIMIT);

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
 * Janela de 15 minutos para prevenir brute-force em credenciais
 */
export async function checkAuthRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const quarterHour = Math.floor(now / 900); // 900s = 15 minutos

  const authKey = `rate_limit:auth:${ipAddress}:${quarterHour}`;
  const allowed = await checkLimit(authKey, AUTH_LIMIT, 900); // TTL 15 min

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
