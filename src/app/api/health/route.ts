// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import redis from '@/lib/redis';
import * as CircuitBreaker from '@/lib/circuit-breaker';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: 'up' | 'down'; responseTime?: number; error?: string };
    redis: { status: 'up' | 'down'; responseTime?: number; error?: string };
    circuitBreakers: Record<string, { status: 'closed' | 'open'; failureCount: number; openUntil: number | null }>;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export async function GET() {
  const startTime = Date.now();
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'down' },
      redis: { status: 'down' },
      circuitBreakers: {},
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
  };

  // 1. Check Database
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    healthCheck.services.database = {
      status: 'up',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthCheck.status = 'unhealthy';
  }

  // 2. Check Redis
  const redisStart = Date.now();
  try {
    await redis.ping();
    healthCheck.services.redis = {
      status: 'up',
      responseTime: Date.now() - redisStart,
    };
  } catch (error) {
    healthCheck.services.redis = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    healthCheck.status = 'degraded'; // Redis down é degraded, não unhealthy
  }

  // 3. Check Circuit Breakers
  const providers: CircuitBreaker.Provider[] = ['openai', 'google', 'meta', 'sms_witi', 'sms_seven', 'vapi', 'hume'];
  for (const provider of providers) {
    const stats = CircuitBreaker.getStats(provider);
    healthCheck.services.circuitBreakers[provider] = {
      status: stats.isOpen ? 'open' : 'closed',
      failureCount: stats.failureCount,
      openUntil: stats.openUntil,
    };

    // Se algum circuit breaker crítico está aberto, status degraded
    if (stats.isOpen && ['meta', 'openai', 'google'].includes(provider)) {
      healthCheck.status = healthCheck.status === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }

  // 4. Memory Usage
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // Retorna status HTTP baseado no health status
  const httpStatus = healthCheck.status === 'healthy' ? 200 : healthCheck.status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthCheck, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
