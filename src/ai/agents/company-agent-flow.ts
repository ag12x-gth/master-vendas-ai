// src/ai/agents/company-agent-flow.ts
'use server';

import { z } from 'zod';
import { getUserSession } from '@/app/actions';
import { db, aiChats, aiPersonas } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Schemas para validação de entrada e saída
const CompanyAgentInputSchema = z.object({
  chatId: z.string().describe("O ID único da sessão de chat para manter o histórico."),
  query: z.string().describe("A pergunta do utilizador em linguagem natural."),
});

const CompanyAgentOutputSchema = z.object({
  answer: z.string().describe("A resposta da IA para a pergunta do utilizador, formatada em HTML."),
});

const EXTERNAL_API_URL = 'https://multidesk-master-ia-agentes.vs1kre.easypanel.host';

/**
 * Agente principal que atua como um cliente para a API de IA externa.
 * @param input A query do utilizador e o ID do chat.
 * @returns A resposta da API externa.
 */
export async function companyAgent(input: z.infer<typeof CompanyAgentInputSchema>): Promise<z.infer<typeof CompanyAgentOutputSchema>> {
    try {
        const session = await getUserSession();
        if (!session.user?.companyId) {
            throw new Error("Sessão inválida ou ID da empresa não encontrado.");
        }

        const { chatId, query } = input;

        // Buscar a persona associada ao chat
        const [chat] = await db.select({ personaId: aiChats.personaId }).from(aiChats).where(eq(aiChats.id, chatId));
        
        if (!chat || !chat.personaId) {
            throw new Error("Este chat não está associado a nenhum agente de IA configurado.");
        }
        
        const [persona] = await db.select().from(aiPersonas).where(eq(aiPersonas.id, chat.personaId));

        if (!persona) {
             throw new Error(`Agente de IA com ID ${chat.personaId} não encontrado.`);
        }

        const response = await fetch(`${EXTERNAL_API_URL}/personas/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: query,
                company_id: session.user.companyId,
                persona_id: chat.personaId,
                contact_id: session.user.id, // Usando userId como contact_id para rastreamento
                context: {
                    conversation_id: chatId,
                    source: 'zap-master-webapp',
                }
            })
        });
        
        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error?.message || data.error || 'Erro desconhecido da API de IA.';
            throw new Error(`Erro da API de Agentes: ${errorMessage}`);
        }
        
        // A resposta da sua API já vem no formato esperado
        return CompanyAgentOutputSchema.parse({ answer: data.message });

    } catch (error) {
        console.error("[Company Agent Flow] Erro na chamada à API externa:", error);
        return CompanyAgentOutputSchema.parse({
            answer: `<b>Erro ao comunicar com o serviço de IA:</b> ${(error as Error).message}`
        });
    }
}
