import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimits, checkIpRateLimit, checkAuthRateLimit } from '../src/lib/rate-limiter';
import redis from '../src/lib/redis';

describe('Rate Limiter - Lua Script Atômico', () => {
  beforeEach(async () => {
    await redis.flushall();
  });

  it('deve permitir requisições dentro do limite', async () => {
    const result1 = await checkRateLimits('company-1', 'user-1');
    expect(result1.allowed).toBe(true);

    const result2 = await checkRateLimits('company-1', 'user-1');
    expect(result2.allowed).toBe(true);
  });

  it('deve bloquear após exceder limite de usuário (20/min)', async () => {
    // Mesmo usuário fazendo 20 requisições
    for (let i = 0; i < 20; i++) {
      const result = await checkRateLimits('company-test', 'user-same');
      expect(result.allowed).toBe(true);
    }

    // 21ª requisição deve ser bloqueada
    const blocked = await checkRateLimits('company-test', 'user-same');
    expect(blocked.allowed).toBe(false);
    expect(blocked.message).toContain('Limite de requisições do utilizador');
  });

  it('deve bloquear após exceder limite de IP (10/min)', async () => {
    for (let i = 0; i < 10; i++) {
      const result = await checkIpRateLimit('192.168.1.1');
      expect(result.allowed).toBe(true);
    }

    const blocked = await checkIpRateLimit('192.168.1.1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.message).toContain('Limite de requisições por IP');
  });

  it('deve bloquear tentativas de login após 5 tentativas em 15min', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkAuthRateLimit('10.0.0.1');
      expect(result.allowed).toBe(true);
    }

    const blocked = await checkAuthRateLimit('10.0.0.1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.message).toContain('Muitas tentativas de login');
  });

  it('deve usar sliding window - timestamps expirados devem ser removidos', async () => {
    const ip = '203.0.113.5';
    
    for (let i = 0; i < 5; i++) {
      await checkIpRateLimit(ip);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await checkIpRateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it('deve garantir atomicidade - teste de concorrência', async () => {
    const promises: Promise<{ allowed: boolean; message?: string }>[] = [];
    for (let i = 0; i < 25; i++) {
      promises.push(checkRateLimits('company-concurrent', 'user-concurrent'));
    }

    const results = await Promise.all(promises);
    const allowed = results.filter(r => r.allowed).length;
    const blocked = results.filter(r => !r.allowed).length;

    expect(allowed).toBe(20);
    expect(blocked).toBe(5);
  });

  it('deve isolar limites entre diferentes empresas', async () => {
    // Esgota limite do user-A na company-A
    for (let i = 0; i < 20; i++) {
      await checkRateLimits('company-A', 'user-A');
    }

    // user-A deve estar bloqueado na company-A
    const resultCompanyA = await checkRateLimits('company-A', 'user-A');
    expect(resultCompanyA.allowed).toBe(false);

    // user-B na company-B deve funcionar normalmente (isolamento)
    const resultCompanyB = await checkRateLimits('company-B', 'user-B');
    expect(resultCompanyB.allowed).toBe(true);
  });

  it('deve aplicar TTL corretamente', async () => {
    await checkIpRateLimit('1.2.3.4');
    
    const ttl = await redis.ttl('rate_limit:ip:1.2.3.4');
    expect(ttl).toBeGreaterThan(50);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});
