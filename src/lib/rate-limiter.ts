
'use server';

import redis from './redis';

interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

const COMPANY_LIMIT = 60; // Requisições por minuto por empresa
const USER_LIMIT = 20;    // Requisições por minuto por utilizador

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
