// src/app/api/v1/templates/sync/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { connections, templates } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { getCompanyIdFromSession } from '@/app/actions';

export const dynamic = 'force-dynamic';

// Esta é uma definição de tipo simplificada para a resposta da API da Meta.
type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT';
    example?: any;
  }[];
};

async function fetchTemplatesFromMeta(wabaId: string, accessToken: string): Promise<MetaTemplate[]> {
    const url = `https://graph.facebook.com/v23.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=500`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
        const errorData = await response.json() as unknown;
        console.error(`Meta API Error for WABA ${wabaId}:`, errorData);
        throw new Error((errorData as any)?.error.message || 'Falha ao buscar modelos da Meta.');
    }

    const data = await response.json() as { data: MetaTemplate[] };
    return data.data || [];
}

export async function POST(_request: NextRequest) {
    console.log('🔵 Iniciando sincronização de modelos...');
    let totalSynced = 0;
    let totalDeleted = 0;
    let totalFailed = 0;

    try {
        const companyId = await getCompanyIdFromSession();
        const activeConnections = await db
            .select()
            .from(connections)
            .where(and(eq(connections.isActive, true), eq(connections.companyId, companyId)));

        if (activeConnections.length === 0) {
            return NextResponse.json({ message: 'Nenhuma conexão ativa encontrada para sincronizar.' });
        }
        
        // Process WABAs uniquely to avoid redundant API calls
        const uniqueWabas = Array.from(new Map(activeConnections.map(c => [c.wabaId, c])).values());

        for (const conn of uniqueWabas) {
            try {
                const decryptedToken = decrypt(conn.accessToken);
                if (!decryptedToken) {
                    throw new Error(`Falha ao desencriptar token para a conexão associada à WABA ${conn.wabaId}`);
                }
                
                const metaTemplates = await fetchTemplatesFromMeta(conn.wabaId, decryptedToken);
                const metaTemplateIds = metaTemplates.map(t => t.id);

                // --- Lógica de Deleção ---
                const deletionConditions = [
                    eq(templates.wabaId, conn.wabaId),
                ];
                if (metaTemplateIds.length > 0) {
                  deletionConditions.push(notInArray(templates.metaId, metaTemplateIds));
                }

                const deleted = await db.delete(templates)
                    .where(and(...deletionConditions))
                    .returning({ id: templates.id });
                    
                totalDeleted += deleted.length;
                
                // --- Lógica de UPSERT ---
                if (metaTemplates.length > 0) {
                  for (const metaTpl of metaTemplates) {
                      const bodyComponent = metaTpl.components.find(c => c.type === 'BODY');
                      const headerComponent = metaTpl.components.find(c => c.type === 'HEADER');

                      const templateData = {
                          companyId: companyId,
                          wabaId: conn.wabaId,
                          name: metaTpl.name,
                          language: metaTpl.language,
                          category: metaTpl.category,
                          status: metaTpl.status,
                          body: bodyComponent?.text || '',
                          headerType: headerComponent?.format || 'NONE',
                          metaId: metaTpl.id,
                          updatedAt: new Date(),
                      };

                      await db.insert(templates)
                          .values(templateData)
                          .onConflictDoUpdate({
                              target: templates.metaId,
                              set: { 
                                  ...templateData,
                                  id: undefined, // não atualiza o nosso ID primário
                                  createdAt: undefined, // não atualiza a data de criação
                              },
                          });
                      
                      totalSynced++;
                  }
                }
            } catch (error) {
                console.error(`Falha ao sincronizar templates para a WABA ${conn.wabaId}:`, error);
                totalFailed++;
            }
        }
        
        const summaryMessage = `${totalSynced} modelos foram atualizados/criados e ${totalDeleted} modelos obsoletos foram removidos.`;
        console.log(`✅ Sincronização concluída. ${summaryMessage}`);
        return NextResponse.json({ success: true, message: summaryMessage, synced: totalSynced, deleted: totalDeleted, failedConnections: totalFailed });

    } catch (error) {
        console.error('Erro geral no endpoint de sincronização:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor.';
        return NextResponse.json({ error: errorMessage, details: (error as Error).stack }, { status: 500 });
    }
}
