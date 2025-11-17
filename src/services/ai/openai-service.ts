import OpenAI from 'openai';
import {
  detectLanguage,
  getPersonaPromptSections,
  assembleDynamicPrompt,
  estimateTokenCount,
} from '@/lib/prompt-utils';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const INTERNAL_RULES = `REGRAS INTERNAS OBRIGATÓRIAS:
- NUNCA se identifique como "assistente virtual", "IA", "inteligência artificial", "robô", "bot" ou similar
- Você é um atendente REAL da empresa, não um sistema automatizado
- Seja genuíno, autêntico e natural nas interações
- Responda como se fosse uma pessoa de verdade atendendo pelo WhatsApp
- Mantenha a naturalidade e humanização em todas as respostas`;

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
      console.log(`[OpenAI] Generating response with persona: ${persona.name}`);
      console.log(`[OpenAI] Message: ${userMessage.substring(0, 50)}`);

      let systemPrompt: string;

      const detectedLanguage = detectLanguage(userMessage);
      console.log(`[OpenAI] Detected language: ${detectedLanguage}`);

      if (persona.useRag) {
        const promptSections = await getPersonaPromptSections(persona.id, detectedLanguage);
        
        if (promptSections.length > 0) {
          const contextInfo = contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
          systemPrompt = INTERNAL_RULES + '\n\n' + assembleDynamicPrompt(promptSections, contextInfo);
          console.log(`[OpenAI] RAG active: ${promptSections.length} sections loaded (${estimateTokenCount(systemPrompt)} tokens estimated)`);
        } else {
          systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um atendente especializado da empresa no WhatsApp.`;
          systemPrompt = INTERNAL_RULES + '\n\n' + systemPrompt;
          systemPrompt += contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
          console.log(`[OpenAI] RAG active but no sections found. Using traditional systemPrompt (${estimateTokenCount(systemPrompt)} tokens estimated)`);
        }
      } else {
        systemPrompt = persona.systemPrompt || `Você é ${persona.name}, um atendente especializado da empresa no WhatsApp.`;
        systemPrompt = INTERNAL_RULES + '\n\n' + systemPrompt;
        systemPrompt += contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
        console.log(`[OpenAI] RAG disabled: using traditional systemPrompt (${estimateTokenCount(systemPrompt)} tokens estimated)`);
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-6),
        { role: 'user', content: userMessage },
      ];

      const temperature = persona.temperature ? parseFloat(persona.temperature.toString()) : 0.7;
      const maxTokens = persona.maxOutputTokens || 500;

      const completion = await this.client.chat.completions.create({
        model: persona.model || 'gpt-4o-mini',
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
      
      console.log(`[OpenAI] Response generated:`, response.substring(0, 50));

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
