// src/app/api/v1/integrations/kommo/status/route.ts

import { NextResponse, type NextRequest } from 'next/server';

/**
 * @deprecated This endpoint is disabled as Kommo integration is not part of the MVP.
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Funcionalidade desativada.' },
    { status: 404 }
  );
}
