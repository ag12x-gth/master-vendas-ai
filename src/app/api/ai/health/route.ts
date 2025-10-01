
// src/app/api/ai/health/route.ts
import { NextResponse } from 'next/server';
import { getActiveAIProviders, getModel } from '@/ai/llm';
import redis from '@/lib/redis';
import { PRICE_TABLE, hasExceededDailyBudget, isPricingAvailable } from '@/lib/costs';
import type { ModelName, ModelProvider } from '@/lib/costs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const responsePayload: Record<string, any> = { ok: true };

    try {
        const { model: _model, provider, modelName } = await getModel();
        responsePayload.provider = provider;
        responsePayload.model = modelName;
        responsePayload.env = getActiveAIProviders();

        const redisPing = await redis.ping();
        let usedMemory = 'N/A';
        let hitRate = 'N/A';
        
        if (redisPing === 'PONG') {
            const redisInfo = await redis.info();
            usedMemory = redisInfo.match(/used_memory_human:([\d.]+.)/)?.[1] || 'N/A';
            const hitRateMatch = redisInfo.match(/keyspace_hits:(\d+)/);
            const missRateMatch = redisInfo.match(/keyspace_misses:(\d+)/);
            if (hitRateMatch && missRateMatch) {
                const hits = hitRateMatch?.[1] ? parseInt(hitRateMatch[1]!, 10) : 0;
                const misses = missRateMatch?.[1] ? parseInt(missRateMatch[1]!, 10) : 0;
                const total = hits + misses;
                hitRate = total > 0 ? `${((hits / total) * 100).toFixed(2)}%` : '0.00%';
            }
        }
        responsePayload.redis = {
            connected: redisPing === 'PONG',
            usedMemory,
            hitRate,
        };

        if (provider && modelName) {
            const pricingIsAvailable = isPricingAvailable(provider as ModelProvider, modelName as ModelName);
            responsePayload.pricingFound = await pricingIsAvailable;
            if (await pricingIsAvailable) {
                 const pricingKey = `${provider}:${modelName.replace('-latest','')}`;
                 responsePayload.pricingDetails = PRICE_TABLE[pricingKey];
            }
        } else {
             responsePayload.pricingFound = false;
        }
        
        if (process.env.AI_DISABLE_BUDGET === '1') {
            responsePayload.budgetCheckSample = 'skipped (disabled)';
        } else {
            responsePayload.budgetCheckSample = await hasExceededDailyBudget('health-check-company', 'health-check-request', provider as ModelProvider, modelName as ModelName);
        }

    } catch (error) {
        responsePayload.ok = false;
        responsePayload.error = "Erro durante o health check.";
        responsePayload.details = (error as Error).message;
    }
    
    // Garante que a resposta seja sempre 200 OK, com o status dentro do JSON.
    return NextResponse.json(responsePayload, { status: 200 });
}
