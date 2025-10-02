import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

async function verifyVapiSignature(request: NextRequest, body: string): Promise<boolean> {
  const signature = request.headers.get('x-signature');
  const timestamp = request.headers.get('x-timestamp');
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (!secret) {
    if (isDev) {
      console.warn('VAPI_WEBHOOK_SECRET not configured - allowing in development mode');
      return true;
    } else {
      console.error('VAPI_WEBHOOK_SECRET not configured in production');
      throw new Error('VAPI_WEBHOOK_SECRET must be configured in production');
    }
  }

  if (!signature || !timestamp) {
    if (isDev) {
      console.warn('⚠️ Missing x-signature or x-timestamp header - allowing in development mode');
      console.warn('⚠️ For production, configure HMAC authentication in Vapi dashboard');
      return true;
    }
    console.error('Missing x-signature or x-timestamp header');
    return false;
  }

  const payload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  const isValid = signature === expectedSignature;
  
  if (!isValid) {
    console.error('HMAC signature mismatch', {
      received: signature,
      expected: expectedSignature,
      timestamp,
      payloadLength: body.length
    });
  }

  return isValid;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body);
    
    // Verify webhook signature
    const isValid = await verifyVapiSignature(request, body);
    if (!isValid) {
      console.error('Invalid Vapi webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('📞 Vapi webhook received:', payload.type);

    switch (payload.type) {
      case 'call-started':
        await handleCallStarted(payload);
        break;
        
      case 'call-ended':
        await handleCallEnded(payload);
        break;
        
      case 'function-call':
        return await handleFunctionCall(payload);
        
      case 'transcript':
        await handleTranscript(payload);
        break;
        
      case 'status-update':
        await handleStatusUpdate(payload);
        break;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing Vapi webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleCallStarted(payload: any) {
  const { call } = payload;
  
  console.log(`📱 Call ${call.id} started with ${call.customer.number}`);
  
  // TODO: Update database with call start
}

async function handleCallEnded(payload: any) {
  const { call } = payload;
  
  console.log(`📴 Call ${call.id} ended. Duration: ${call.duration}s`);
  
  // Extract transcript
  const transcript = call.messages
    ?.filter((m: any) => m.role === 'assistant' || m.role === 'user')
    ?.map((m: any) => `${m.role}: ${m.content}`)
    ?.join('\n') || '';
  
  // Generate summary
  const summary = call.analysis?.summary || 'Chamada concluída';
  
  // Send summary via WhatsApp if we have conversation context
  const _conversationId = call.metadata?.conversationId;
  const customerPhone = call.customer.number;
  
  if (customerPhone) {
    await sendWhatsAppSummary(customerPhone, summary, transcript);
  }
  
  // TODO: Save to database
  console.log('✅ Call summary:', summary);
}

async function handleFunctionCall(payload: any) {
  const { functionCall, call: _call } = payload;
  
  console.log(`🔧 Function call: ${functionCall.name}`);

  if (functionCall.name === 'escalate_to_human') {
    const { reason } = functionCall.parameters;
    
    console.log(`👤 Escalating to human: ${reason}`);
    
    // TODO: Implement actual human transfer
    // For now, return a message
    return NextResponse.json({
      result: {
        success: true,
        message: `Transferindo você para um atendente humano. Motivo: ${reason}. Por favor, aguarde na linha.`,
        action: 'transfer_pending'
      }
    });
  }
  
  if (functionCall.name === 'save_call_summary') {
    const { summary, resolved, nextSteps } = functionCall.parameters;
    
    console.log('💾 Saving call summary:', { summary, resolved, nextSteps });
    
    // TODO: Save to database
    
    return NextResponse.json({
      result: {
        success: true,
        message: 'Resumo salvo com sucesso!'
      }
    });
  }
  
  return NextResponse.json({ result: {} });
}

async function handleTranscript(payload: any) {
  const { transcript, call: _call } = payload;
  
  console.log(`📝 Transcript: ${transcript.role}: ${transcript.text}`);
  
  // TODO: Save real-time transcript to database
}

async function handleStatusUpdate(payload: any) {
  const { call, status } = payload;
  
  console.log(`📊 Call ${call.id} status: ${status}`);
}

async function sendWhatsAppSummary(phoneNumber: string, summary: string, transcript?: string) {
  try {
    const message = `📞 *Resumo da Ligação*\n\n${summary}\n\n${transcript ? `\n📝 *Transcrição:*\n${transcript.substring(0, 500)}${transcript.length > 500 ? '...' : ''}` : ''}\n\nObrigado por entrar em contato com a Master IA! 🚀`;
    
    // Send via Meta API (more reliable for important messages)
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/whatsapp/send-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        type: 'text'
      })
    });
    
    if (response.ok) {
      console.log('✅ Summary sent via WhatsApp');
    } else {
      console.error('Failed to send WhatsApp summary:', await response.text());
    }
  } catch (error) {
    console.error('Error sending WhatsApp summary:', error);
  }
}
