// src/app/api/v1/campaigns/[campaignId]/report/route.ts
import { NextResponse } from 'next/server';

/**
 * @deprecated Esta rota foi descontinuada e a sua lógica movida para /api/v1/campaigns/[campaignId].
 * Este handler existe apenas para prevenir erros de compilação.
 */
export async function GET() {
    return NextResponse.json({ error: 'This endpoint is deprecated and should not be used.' }, { status: 404 });
}
