import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    logger.info('[SIP Status] Received SIP status callback', {
      callSid: body.CallSid,
      sipCallId: body.SipCallId,
      sipResponseCode: body.SipResponseCode,
      callStatus: body.CallStatus,
      dialCallStatus: body.DialCallStatus,
      dialSipResponseCode: body.DialSipResponseCode,
    });

    logger.info('[SIP Status] Full payload', { body: JSON.stringify(body) });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('[SIP Status] Error processing SIP status', { error });
    return new NextResponse('Error', { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'SIP Status endpoint is ready' 
  });
}
