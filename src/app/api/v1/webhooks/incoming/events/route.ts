import { NextRequest, NextResponse } from 'next/server';
import { conn } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const events = await conn.unsafe(`
      SELECT 
        id, 
        event_type, 
        source,
        signature_valid,
        processed_at,
        created_at,
        payload
      FROM incoming_webhook_events
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await conn.unsafe(`
      SELECT COUNT(*) as count FROM incoming_webhook_events
    `);

    return NextResponse.json({
      data: events,
      pagination: {
        total: (countResult as any)?.[0]?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[WEBHOOK-EVENTS-API]', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook events', details: String(error) },
      { status: 500 }
    );
  }
}
