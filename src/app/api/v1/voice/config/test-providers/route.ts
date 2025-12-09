import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

async function testRetellProvider(): Promise<{ success: boolean; message: string; details?: unknown }> {
  const apiKey = process.env.RETELL_API_KEY;
  
  if (!apiKey) {
    return { success: false, message: 'RETELL_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.retellai.com/list-agents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: 'Retell API connected successfully',
        details: { agentCount: Array.isArray(data) ? data.length : 0 },
      };
    } else {
      const errorText = await response.text();
      return { 
        success: false, 
        message: `Retell API error: ${response.status}`,
        details: errorText,
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTwilioProvider(): Promise<{ success: boolean; message: string; details?: unknown }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    return { success: false, message: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured' };
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { 
        success: true, 
        message: 'Twilio API connected successfully',
        details: { friendlyName: data.friendly_name, status: data.status },
      };
    } else {
      const errorText = await response.text();
      return { 
        success: false, 
        message: `Twilio API error: ${response.status}`,
        details: errorText,
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testLLMProvider(): Promise<{ success: boolean; message: string; details?: unknown }> {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  if (!openaiKey) {
    return { success: false, message: 'OPENAI_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
    });

    if (response.ok) {
      return { 
        success: true, 
        message: 'OpenAI API connected successfully',
      };
    } else {
      const errorText = await response.text();
      return { 
        success: false, 
        message: `OpenAI API error: ${response.status}`,
        details: errorText,
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(_request: NextRequest) {
  try {
    const [voiceResult, telephonyResult, llmResult] = await Promise.all([
      testRetellProvider(),
      testTwilioProvider(),
      testLLMProvider(),
    ]);

    logger.info('Voice providers tested', { 
      voice: voiceResult.success,
      telephony: telephonyResult.success,
      llm: llmResult.success 
    });

    return NextResponse.json({
      success: true,
      data: {
        voice: voiceResult,
        telephony: telephonyResult,
        llm: llmResult,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error testing voice providers', { error });
    return NextResponse.json(
      { error: 'Falha ao testar providers de voz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
