// src/app/api/v1/integrations/kommo/push-lead-note/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(_request: NextRequest) {
  // TODO: Implementar lógica para adicionar uma nota a um lead na Kommo
  if (process.env.NODE_ENV !== 'production') console.debug('Received request to push lead note to Kommo');
  return NextResponse.json({ success: true, message: 'Endpoint de push de nota atingido.' });
}
