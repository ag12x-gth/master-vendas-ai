// src/app/api/v1/integrations/kommo/push-contact/route.ts
'use server';

import { NextResponse, type NextRequest } from 'next/server';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  // TODO: Implementar lógica de busca e criação/atualização de contato na Kommo
  if (process.env.NODE_ENV !== 'production') console.debug('Received request to push contact to Kommo');
  return NextResponse.json({ success: true, message: 'Endpoint de push de contato atingido.' });
}
