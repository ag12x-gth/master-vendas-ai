// src/app/api/v1/integrations/kommo/webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('[Kommo Webhook] Received:', JSON.stringify(payload, null, 2));

    // Here we will add the logic to process different events:
    // lead.add, lead.update, lead.status.changed, contact.update, note.add

    return NextResponse.json({ success: true, message: 'Webhook received.' });
  } catch (error) {
    console.error('Error processing Kommo webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
