import { NextRequest, NextResponse } from 'next/server';

interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text' | 'poll' | 'buttons';
  options?: {
    pollName?: string;
    pollOptions?: string[];
    pollMaxChoices?: number;
    buttons?: string[];
    footer?: string;
  };
}


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { to, message, type = 'text', options }: SendMessageRequest = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const whatsmeowUrl = process.env.WHATSMEOW_SERVICE_URL || 'http://localhost:8001';
    const basicAuth = Buffer.from(
      `admin:${process.env.WHATSMEOW_PASSWORD || 'masterIA2024'}`
    ).toString('base64');

    let endpoint = '/send/message';
    let body: any = {
      phone: to.replace(/\D/g, ''), // Remove non-digits
      message: message
    };

    // Handle different message types
    if (type === 'poll' && options?.pollName && options?.pollOptions) {
      endpoint = '/send/poll';
      body = {
        phone: to.replace(/\D/g, ''),
        pollName: options.pollName,
        pollOptions: options.pollOptions,
        countable: options.pollMaxChoices || 1
      };
    } else if (type === 'buttons' && options?.buttons) {
      endpoint = '/send/button';
      body = {
        phone: to.replace(/\D/g, ''),
        message: message,
        footer: options.footer || '',
        buttons: options.buttons
      };
    }

    const response = await fetch(`${whatsmeowUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`whatsmeow API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.id,
      data: data
    });

  } catch (error: any) {
    console.error('Error sending via whatsmeow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const whatsmeowUrl = process.env.WHATSMEOW_SERVICE_URL || 'http://localhost:8001';
    const basicAuth = Buffer.from(
      `admin:${process.env.WHATSMEOW_PASSWORD || 'masterIA2024'}`
    ).toString('base64');

    const response = await fetch(`${whatsmeowUrl}/app/devices`, {
      headers: {
        'Authorization': `Basic ${basicAuth}`
      }
    });

    if (!response.ok) {
      throw new Error(`whatsmeow API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      devices: data
    });

  } catch (error: any) {
    console.error('Error getting whatsmeow status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
