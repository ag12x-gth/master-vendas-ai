// src/app/api/v1/integrations/kommo/status/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';

/**
 * @deprecated This endpoint is disabled as Kommo integration is not part of the MVP.
 */
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Funcionalidade desativada.' },
    { status: 404 }
  );
}
