import OpenAI from 'openai';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  async generateResponse(
    userMessage: string,
    contactName?: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      const systemPrompt = `Você é um assistente virtual prestativo e amigável que responde mensagens de WhatsApp.
${contactName ? `O nome do cliente é ${contactName}.` : ''}

Instruções:
- Seja breve e direto nas respostas (máximo 2-3 frases quando possível)
- Use tom amigável e profissional
- Responda em português brasileiro
- Se não souber algo, seja honesto
- Ofereça ajuda adicional quando apropriado`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6), // Últimas 3 interações (6 mensagens)
        { role: 'user', content: userMessage },
      ];

      console.log('[OpenAI] Generating response for message:', userMessage.substring(0, 50));

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
      
      console.log('[OpenAI] Response generated:', response.substring(0, 50));

      return response;
    } catch (error) {
      console.error('[OpenAI] Error generating response:', error);
      throw error;
    }
  }

  async generateResponseWithPersona(
    userMessage: string,
    contactName: string | undefined,
    conversationHistory: ChatMessage[],
    persona: any
  ): Promise<string> {
    try {
      const systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um assistente especializado.`;
      
      const enrichedPrompt = `${systemPrompt}

${contactName ? `O nome do cliente é ${contactName}.` : ''}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: enrichedPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: userMessage },
      ];

      console.log(`[OpenAI] Generating response with persona: ${persona.name}`);
      console.log(`[OpenAI] Message: ${userMessage.substring(0, 50)}`);

      const temperature = persona.temperature ? parseFloat(persona.temperature.toString()) : 0.7;
      const maxTokens = persona.maxOutputTokens || 500;

      const completion = await this.client.chat.completions.create({
        model: persona.model || 'gpt-4o-mini',
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
      
      console.log(`[OpenAI] Response generated with ${persona.name}:`, response.substring(0, 50));

      return response;
    } catch (error) {
      console.error('[OpenAI] Error generating response with persona:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('[OpenAI] Service unavailable:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
