// test-whatsapp-direct.ts
import { db } from './src/lib/db';
import { conversations, messages, contacts, templates, connections } from './src/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendWhatsappTemplateMessage, sendWhatsappTextMessage } from './src/lib/facebookApiService';

async function runWhatsAppTests() {
    console.log("========================================");
    console.log("TESTE DIRETO DE ENVIO DE MENSAGENS WHATSAPP");
    console.log("========================================\n");
    
    // Dados para teste
    const companyId = "0fe148f6-b899-4e63-ab10-2cef27bdf3f3";
    const contactId = "2ab784a5-3277-43b7-aec7-907ba9a0d875";
    const connectionId = "a2450857-2e9f-42ab-8d6a-4f8f318e4e5e";
    const templateId = "545126a5-95e3-4873-8edf-ed9bf7791633"; // hello_world template
    
    let conversationId: string | null = null;
    let messageCount = 0;
    
    try {
        // ============================================
        // TESTE 1: Buscar dados necessários
        // ============================================
        console.log("📋 TESTE 1: Verificando dados necessários");
        console.log("-----------------------------------------");
        
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
        const [template] = await db.select().from(templates).where(eq(templates.id, templateId));
        const [connection] = await db.select().from(connections).where(eq(connections.id, connectionId));
        
        if (!contact) {
            console.log("❌ Contato não encontrado");
            return;
        }
        if (!template) {
            console.log("❌ Template não encontrado");
            return;
        }
        if (!connection) {
            console.log("❌ Conexão não encontrada");
            return;
        }
        
        console.log("✅ Contato encontrado:", contact.name, "-", contact.phone);
        console.log("✅ Template encontrado:", template.name, "-", template.language);
        console.log("✅ Conexão encontrada:", connection.config_name);
        console.log("   Phone Number ID:", connection.phoneNumberId);
        console.log("   WABA ID:", connection.wabaId);
        
        // ============================================
        // TESTE 2: Enviar mensagem de template
        // ============================================
        console.log("\n📨 TESTE 2: Enviando mensagem de template");
        console.log("-----------------------------------------");
        
        try {
            const components: any[] = [];
            
            // Se o template tiver variáveis no corpo, adicionar parâmetros
            const bodyVariables = template.body.match(/\{\{(\d+)\}\}/g) || [];
            if (bodyVariables.length > 0) {
                const bodyParams = bodyVariables.map((placeholder, index) => {
                    return { type: 'text', text: `Valor ${index + 1}` };
                });
                components.push({ type: 'body', parameters: bodyParams });
            }
            
            console.log("📤 Enviando para:", contact.phone);
            console.log("📄 Template:", template.name);
            console.log("🌍 Idioma:", template.language);
            
            const response = await sendWhatsappTemplateMessage({
                connectionId: connection.id,
                to: contact.phone,
                templateName: template.name,
                languageCode: template.language,
                components,
            });
            
            const sentMessageId = (response as any).messages?.[0]?.id;
            
            if (sentMessageId) {
                console.log("✅ SUCESSO: Mensagem enviada!");
                console.log("   Message ID WhatsApp:", sentMessageId);
                console.log("   Resposta completa:", JSON.stringify(response, null, 2));
            } else {
                console.log("⚠️ Mensagem pode ter sido enviada mas sem ID de retorno");
                console.log("   Resposta:", JSON.stringify(response, null, 2));
            }
            
            // ============================================
            // TESTE 3: Criar/Atualizar conversa e salvar mensagem
            // ============================================
            console.log("\n💾 TESTE 3: Salvando no banco de dados");
            console.log("-----------------------------------------");
            
            // Buscar ou criar conversa
            let [existingConversation] = await db
                .select()
                .from(conversations)
                .where(and(
                    eq(conversations.contactId, contact.id),
                    eq(conversations.connectionId, connection.id)
                ));
            
            if (existingConversation) {
                console.log("📂 Conversa existente encontrada:", existingConversation.id);
                
                // Atualizar conversa
                await db.update(conversations).set({
                    lastMessageAt: new Date(),
                    status: 'IN_PROGRESS',
                    archivedAt: null,
                    archivedBy: null,
                }).where(eq(conversations.id, existingConversation.id));
                
                conversationId = existingConversation.id;
            } else {
                console.log("📁 Criando nova conversa...");
                
                const [newConversation] = await db.insert(conversations).values({
                    companyId: companyId,
                    contactId: contact.id,
                    connectionId: connection.id,
                    status: 'IN_PROGRESS'
                }).returning();
                
                conversationId = newConversation.id;
                console.log("✅ Nova conversa criada:", conversationId);
            }
            
            // Salvar mensagem
            const [savedMessage] = await db.insert(messages).values({
                conversationId: conversationId!,
                providerMessageId: sentMessageId || 'TEST_' + Date.now(),
                senderType: 'AGENT',
                content: `Template: ${template.name}`,
                contentType: 'TEXT',
                status: 'SENT',
                sentAt: new Date(),
            }).returning();
            
            console.log("✅ Mensagem salva no banco:");
            console.log("   ID:", savedMessage.id);
            console.log("   Status:", savedMessage.status);
            console.log("   Tipo:", savedMessage.contentType);
            
            messageCount++;
            
        } catch (error) {
            console.log("❌ ERRO ao enviar mensagem de template:");
            console.log("   Erro:", (error as Error).message);
            
            // Verificar se é erro de token inválido
            if ((error as Error).message.includes('token') || (error as Error).message.includes('access')) {
                console.log("   💡 Possível problema com access token da conexão");
            }
        }
        
        // ============================================
        // TESTE 4: Enviar mensagem de texto simples
        // ============================================
        if (conversationId) {
            console.log("\n💬 TESTE 4: Enviando mensagem de texto simples");
            console.log("-----------------------------------------------");
            
            try {
                // Verificar se há mensagem do usuário nas últimas 24h
                const [lastUserMessage] = await db.select()
                    .from(messages)
                    .where(and(
                        eq(messages.conversationId, conversationId),
                        eq(messages.senderType, 'USER')
                    ))
                    .orderBy(desc(messages.sentAt))
                    .limit(1);
                
                if (!lastUserMessage) {
                    console.log("⚠️ Não há mensagem do usuário nas últimas 24h");
                    console.log("   A API do WhatsApp só permite mensagens livres dentro de 24h após mensagem do usuário");
                    console.log("   Pulando teste de mensagem de texto...");
                } else {
                    const hoursSinceLastMessage = (Date.now() - new Date(lastUserMessage.sentAt).getTime()) / (1000 * 60 * 60);
                    console.log(`⏰ Última mensagem do usuário: ${hoursSinceLastMessage.toFixed(1)} horas atrás`);
                    
                    if (hoursSinceLastMessage > 24) {
                        console.log("⚠️ Janela de 24h expirada, mensagem de texto não permitida");
                    } else {
                        console.log("📤 Enviando mensagem de texto...");
                        
                        const textResponse = await sendWhatsappTextMessage({
                            connectionId: connection.id,
                            to: contact.phone,
                            text: "Esta é uma mensagem de teste enviada diretamente via API"
                        });
                        
                        const textMessageId = (textResponse as any).messages?.[0]?.id;
                        
                        console.log("✅ Mensagem de texto enviada!");
                        console.log("   Message ID:", textMessageId);
                        
                        // Salvar mensagem no banco
                        const [savedTextMessage] = await db.insert(messages).values({
                            conversationId: conversationId,
                            providerMessageId: textMessageId || 'TEST_TEXT_' + Date.now(),
                            senderType: 'AGENT',
                            content: "Esta é uma mensagem de teste enviada diretamente via API",
                            contentType: 'TEXT',
                            status: 'SENT',
                            sentAt: new Date(),
                        }).returning();
                        
                        console.log("✅ Mensagem de texto salva no banco");
                        messageCount++;
                    }
                }
            } catch (error) {
                console.log("❌ ERRO ao enviar mensagem de texto:");
                console.log("   Erro:", (error as Error).message);
            }
        }
        
        // ============================================
        // TESTE 5: Verificar mensagens no banco
        // ============================================
        console.log("\n🔍 TESTE 5: Verificando mensagens no banco de dados");
        console.log("---------------------------------------------------");
        
        if (conversationId) {
            const allMessages = await db.select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(desc(messages.sentAt));
            
            console.log(`📊 Total de mensagens na conversa: ${allMessages.length}`);
            console.log(`📨 Mensagens enviadas neste teste: ${messageCount}`);
            
            if (allMessages.length > 0) {
                console.log("\n📝 Últimas 3 mensagens:");
                allMessages.slice(0, 3).forEach((msg, index) => {
                    console.log(`\n   ${index + 1}. Mensagem ID: ${msg.id}`);
                    console.log(`      Tipo: ${msg.senderType}`);
                    console.log(`      Status: ${msg.status}`);
                    console.log(`      Conteúdo: ${msg.content?.substring(0, 50)}...`);
                    console.log(`      Enviada em: ${new Date(msg.sentAt).toLocaleString('pt-BR')}`);
                });
            }
        }
        
        // ============================================
        // TESTE 6: Verificar status de entrega
        // ============================================
        console.log("\n📮 TESTE 6: Verificando status de entrega");
        console.log("-----------------------------------------");
        
        if (conversationId) {
            // Buscar mensagens com status
            const messagesWithStatus = await db.select()
                .from(messages)
                .where(and(
                    eq(messages.conversationId, conversationId),
                    eq(messages.senderType, 'AGENT')
                ))
                .orderBy(desc(messages.sentAt))
                .limit(5);
            
            console.log("📊 Status das mensagens enviadas:");
            messagesWithStatus.forEach((msg) => {
                let statusIcon = '❓';
                switch (msg.status) {
                    case 'SENT': statusIcon = '📤'; break;
                    case 'DELIVERED': statusIcon = '✅'; break;
                    case 'READ': statusIcon = '👁️'; break;
                    case 'FAILED': statusIcon = '❌'; break;
                }
                console.log(`   ${statusIcon} ${msg.status} - ${msg.content?.substring(0, 30)}...`);
            });
            
            console.log("\n💡 Nota: O status 'DELIVERED' e 'READ' só são atualizados");
            console.log("   quando o WhatsApp envia webhooks de confirmação.");
        }
        
    } catch (error) {
        console.log("\n❌ ERRO GERAL NO TESTE:");
        console.log(error);
    }
    
    // ============================================
    // RESUMO FINAL
    // ============================================
    console.log("\n========================================");
    console.log("📊 RESUMO DOS TESTES");
    console.log("========================================");
    console.log(`✅ Testes executados: 6`);
    console.log(`📨 Mensagens enviadas: ${messageCount}`);
    if (conversationId) {
        console.log(`💬 ID da conversa: ${conversationId}`);
    }
    console.log("\n🔍 Observações importantes:");
    console.log("1. Mensagens de template sempre funcionam");
    console.log("2. Mensagens de texto só funcionam dentro de 24h após resposta do usuário");
    console.log("3. Status de entrega depende de webhooks configurados");
    console.log("4. Erros de token indicam necessidade de renovar credenciais");
    
    console.log("\n========================================");
    console.log("TESTES CONCLUÍDOS");
    console.log("========================================");
    
    // Fechar conexão com o banco
    process.exit(0);
}

// Executar testes
runWhatsAppTests().catch(console.error);