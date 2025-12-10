import { NextRequest, NextResponse } from 'next/server';
import { db, conn } from '@/lib/db';
import { getCompanyIdFromSession } from '@/app/actions';
import { generateWebhookSecret, maskSecret } from '@/lib/webhooks/incoming-handler';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const createConfigSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  source: z.string().min(1, 'Fonte é obrigatória').max(100),
});

interface IncomingWebhookConfigRow {
  id: string;
  company_id: string;
  name: string;
  source: string;
  secret: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/v1/webhooks/incoming
 * List all incoming webhook configurations for the company
 */
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = (page - 1) * limit;

    // Fetch total count
    const countResult = await conn`
      SELECT COUNT(*) as total FROM incoming_webhook_configs WHERE company_id = ${companyId}
    `;
    const total = (countResult as any)?.[0]?.total || 0;

    // Fetch configs
    const configsResult = await conn`
      SELECT id, company_id, name, source, secret, is_active, created_at, updated_at
      FROM incoming_webhook_configs
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const configs = ((configsResult as any) || []).map((config: IncomingWebhookConfigRow) => ({
      ...config,
      secretMasked: maskSecret(config.secret),
      webhookUrl: `/api/v1/webhooks/incoming/${companyId}`,
    }));

    return NextResponse.json({
      data: configs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Incoming Webhooks] GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações de webhook' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/webhooks/incoming
 * Create a new incoming webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyIdFromSession();
    if (!companyId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createConfigSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, source } = validation.data;
    const secret = generateWebhookSecret();

    const result = await conn`
      INSERT INTO incoming_webhook_configs 
      (company_id, name, source, secret, is_active, created_at, updated_at)
      VALUES (${companyId}, ${name}, ${source}, ${secret}, true, NOW(), NOW())
      RETURNING id, company_id, name, source, secret, is_active, created_at, updated_at
    `;

    const config = (result as any)?.[0] as IncomingWebhookConfigRow;

    return NextResponse.json({
      ...config,
      secretMasked: maskSecret(config.secret),
      webhookUrl: `https://${request.headers.get('host')}/api/v1/webhooks/incoming/${companyId}`,
      message: 'Webhook de entrada criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('[Incoming Webhooks] POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar webhook de entrada' },
      { status: 500 }
    );
  }
}
