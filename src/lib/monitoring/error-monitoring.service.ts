// src/lib/monitoring/error-monitoring.service.ts

import { db } from '@/lib/db';
import { systemErrors, users } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { UserNotificationsService } from '@/lib/notifications/user-notifications.service';

type ErrorSource = 'frontend' | 'backend' | 'database' | 'api' | 'webhook';
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface CaptureErrorParams {
  source: ErrorSource;
  message: string;
  errorType?: string;
  stack?: string;
  severity?: ErrorSeverity;
  context?: Record<string, any>;
  companyId?: string;
  userId?: string;
}

interface AIAnalysisResult {
  diagnosis: string;
  recommendation: string;
  suggestedSeverity?: ErrorSeverity;
}

export class ErrorMonitoringService {
  private static DUPLICATE_THRESHOLD_MINUTES = 5;

  static async captureError(params: CaptureErrorParams): Promise<string | null> {
    try {
      // Detectar erro duplicado (mesmo tipo + mensagem nos últimos 5 minutos)
      const duplicateError = await this.findDuplicateError(
        params.errorType || 'Unknown',
        params.message,
        params.source
      );

      if (duplicateError) {
        // Incrementar contador de ocorrência
        await db
          .update(systemErrors)
          .set({
            occurrenceCount: sql`${systemErrors.occurrenceCount} + 1`,
            lastOccurredAt: new Date(),
          })
          .where(eq(systemErrors.id, duplicateError.id));

        console.log(`[ErrorMonitoring] Duplicate error detected (ID: ${duplicateError.id}), count incremented`);
        return duplicateError.id;
      }

      // Criar novo registro de erro
      const [error] = await db
        .insert(systemErrors)
        .values({
          source: params.source,
          errorType: params.errorType || 'Unknown',
          message: params.message,
          stack: params.stack,
          severity: params.severity || 'medium',
          context: params.context as any,
          companyId: params.companyId,
          userId: params.userId,
        })
        .returning();

      if (!error) {
        console.error('[ErrorMonitoring] Failed to create error record');
        return null;
      }

      console.log(`[ErrorMonitoring] Error captured: ${error.id} (${params.source})`);

      // Análise via IA (não aguardar para não bloquear)
      this.analyzeErrorWithAI(error.id, params).catch(err => {
        console.error('[ErrorMonitoring] AI analysis failed:', err);
      });

      // Notificar admin
      this.notifyAdmin(error.id, params).catch(err => {
        console.error('[ErrorMonitoring] Failed to notify admin:', err);
      });

      return error.id;
    } catch (error) {
      console.error('[ErrorMonitoring] Error capturing error (ironic):', error);
      return null;
    }
  }

  private static async findDuplicateError(
    errorType: string,
    message: string,
    source: ErrorSource
  ) {
    const thresholdTime = new Date(Date.now() - this.DUPLICATE_THRESHOLD_MINUTES * 60 * 1000);

    const [duplicate] = await db
      .select()
      .from(systemErrors)
      .where(
        and(
          eq(systemErrors.errorType, errorType),
          eq(systemErrors.message, message),
          eq(systemErrors.source, source),
          sql`${systemErrors.lastOccurredAt} > ${thresholdTime}`
        )
      )
      .limit(1);

    return duplicate;
  }

  private static async analyzeErrorWithAI(
    errorId: string,
    params: CaptureErrorParams
  ): Promise<void> {
    try {
      const openai = await import('openai');
      const client = new openai.default({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const prompt = `Você é um especialista em diagnóstico de erros de software. Analise o erro abaixo e forneça:

1. **Diagnóstico**: O que causou o erro (causa raiz)
2. **Recomendação**: Como corrigir o erro (solução)

**Informações do Erro:**
- Fonte: ${params.source}
- Tipo: ${params.errorType || 'Desconhecido'}
- Mensagem: ${params.message}
- Stack: ${params.stack || 'N/A'}
- Contexto: ${JSON.stringify(params.context || {}, null, 2)}

Responda no formato JSON:
{
  "diagnosis": "descrição da causa raiz",
  "recommendation": "solução sugerida",
  "suggestedSeverity": "low|medium|high|critical"
}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');

      const analysis: AIAnalysisResult = JSON.parse(content);

      // Atualizar erro com análise da IA
      await db
        .update(systemErrors)
        .set({
          aiDiagnosis: analysis.diagnosis,
          aiRecommendation: analysis.recommendation,
          aiAnalyzedAt: new Date(),
          severity: analysis.suggestedSeverity || params.severity || 'medium',
        })
        .where(eq(systemErrors.id, errorId));

      console.log(`[ErrorMonitoring] AI analysis completed for error ${errorId}`);
    } catch (error) {
      console.error('[ErrorMonitoring] AI analysis error:', error);
    }
  }

  private static async notifyAdmin(
    errorId: string,
    params: CaptureErrorParams
  ): Promise<void> {
    try {
      let adminsToNotify: Array<{ id: string; companyId: string | null }> = [];

      if (params.companyId) {
        const companyAdmins = await db
          .select({ id: users.id, companyId: users.companyId })
          .from(users)
          .where(
            and(
              eq(users.companyId, params.companyId),
              sql`${users.role} IN ('admin', 'superadmin')`
            )
          );
        adminsToNotify = companyAdmins;
      }

      if (adminsToNotify.length === 0) {
        const superadmins = await db
          .select({ id: users.id, companyId: users.companyId })
          .from(users)
          .where(eq(users.role, 'superadmin'))
          .limit(5);
        adminsToNotify = superadmins;
      }

      if (adminsToNotify.length === 0) {
        console.warn('[ErrorMonitoring] No admins found to notify');
        return;
      }

      for (const admin of adminsToNotify) {
        await UserNotificationsService.create({
          userId: admin.id,
          companyId: admin.companyId || 'system',
          type: 'system_error',
          title: '🚨 Erro no Sistema',
          message: `[${params.source.toUpperCase()}] ${params.message.substring(0, 150)}`,
          linkTo: `/admin/errors/${errorId}`,
          metadata: { errorId, source: params.source, severity: params.severity },
        });
      }

      console.log(`[ErrorMonitoring] Admin notification sent to ${adminsToNotify.length} admins for error ${errorId}`);
    } catch (error) {
      console.error('[ErrorMonitoring] Failed to notify admin:', error);
    }
  }

  static async getRecentErrors(limit: number = 50, companyId?: string) {
    if (companyId) {
      return await db
        .select()
        .from(systemErrors)
        .where(eq(systemErrors.companyId, companyId))
        .orderBy(desc(systemErrors.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(systemErrors)
      .orderBy(desc(systemErrors.createdAt))
      .limit(limit);
  }

  static async getErrorById(errorId: string) {
    return await db.query.systemErrors.findFirst({
      where: (errors, { eq }) => eq(errors.id, errorId),
    });
  }

  static async markAsResolved(errorId: string, resolvedBy: string) {
    await db
      .update(systemErrors)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
      })
      .where(eq(systemErrors.id, errorId));
  }
}
