const testWhatsAppAPI = async () => {
  console.log("========================================");
  console.log("TESTE DE ENVIO DE MENSAGENS WHATSAPP");
  console.log("========================================\n");

  // Dados para teste
  const contactId = "2ab784a5-3277-43b7-aec7-907ba9a0d875";
  const connectionId = "a2450857-2e9f-42ab-8d6a-4f8f318e4e5e";
  const templateId = "545126a5-95e3-4873-8edf-ed9bf7791633"; // hello_world template
  
  const baseUrl = "http://localhost:5000";

  // Teste 1: Iniciar conversa com template
  console.log("TESTE 1: Iniciando conversa com template");
  console.log("-----------------------------------------");
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/conversations/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactId: contactId,
        connectionId: connectionId,
        templateId: templateId,
        variableMappings: {}
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ SUCESSO: Conversa iniciada!");
      console.log("Conversation ID:", data.conversationId);
      console.log("Resposta completa:", JSON.stringify(data, null, 2));
      
      // Guardar conversationId para próximo teste
      return data.conversationId;
    } else {
      console.log("❌ ERRO ao iniciar conversa:");
      console.log("Status:", response.status);
      console.log("Erro:", JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.log("❌ ERRO de conexão:");
    console.log(error.message);
    return null;
  }
};

// Teste 2: Enviar mensagem em conversa existente
const testSendMessage = async (conversationId) => {
  console.log("\nTESTE 2: Enviando mensagem em conversa existente");
  console.log("-------------------------------------------------");
  
  if (!conversationId) {
    console.log("⚠️ Pulando teste - sem conversationId válido");
    return;
  }

  const baseUrl = "http://localhost:5000";
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "text",
        text: "Esta é uma mensagem de teste enviada via API"
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ SUCESSO: Mensagem enviada!");
      console.log("Message ID:", data.id);
      console.log("Status:", data.status);
      console.log("Resposta completa:", JSON.stringify(data, null, 2));
    } else {
      console.log("❌ ERRO ao enviar mensagem:");
      console.log("Status:", response.status);
      console.log("Erro:", JSON.stringify(data, null, 2));
      
      // Se falhou por causa da janela de 24h, tentar com template
      if (data.error && data.error.includes("24 horas")) {
        console.log("\n📝 Tentando enviar com template...");
        
        const templateResponse = await fetch(`${baseUrl}/api/v1/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "template",
            templateId: "545126a5-95e3-4873-8edf-ed9bf7791633",
            variableMappings: {}
          }),
        });
        
        const templateData = await templateResponse.json();
        
        if (templateResponse.ok) {
          console.log("✅ SUCESSO: Template enviado!");
          console.log("Message ID:", templateData.id);
          console.log("Resposta completa:", JSON.stringify(templateData, null, 2));
        } else {
          console.log("❌ ERRO ao enviar template:");
          console.log("Erro:", JSON.stringify(templateData, null, 2));
        }
      }
    }
  } catch (error) {
    console.log("❌ ERRO de conexão:");
    console.log(error.message);
  }
};

// Executar testes
(async () => {
  const conversationId = await testWhatsAppAPI();
  await testSendMessage(conversationId);
  
  console.log("\n========================================");
  console.log("TESTES CONCLUÍDOS");
  console.log("========================================");
})();