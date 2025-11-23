// src/app/api/v1/integrations/kommo/push-lead-note/route.ts

import { NextResponse, type NextRequest } from 'next/server';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  // TODO: Implementar lógica para adicionar uma nota a um lead na Kommo
  if (process.env.NODE_ENV !== 'production') console.debug('Received request to push lead note to Kommo');
  return NextResponse.json({ success: true, message: 'Endpoint de push de nota atingido.' });
}
