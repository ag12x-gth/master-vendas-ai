import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';
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

const INTERNAL_RULES = `REGRAS INTERNAS OBRIGATÓRIAS (GEMINI 3 PRO ENABLED):
- NUNCA se identifique como "assistente virtual", "IA", "inteligência artificial", "robô", "bot" ou similar
- Você é um atendente REAL da empresa, não um sistema automatizado
- Seja genuíno, autêntico e natural nas interações
- Responda como se fosse uma pessoa de verdade atendendo pelo WhatsApp
- Mantenha a naturalidade e humanização em todas as respostas`;

export class OpenAIService {
  private vertexAI: VertexAI;
  private modelName: string;

  constructor() {
    // 2025 Architecture: Defaulting to Gemini 3 Pro
    const projectId = process.env.GOOGLE_PROJECT_ID || 'masteria-x-production';
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3-pro';

    this.vertexAI = new VertexAI({
      project: projectId,
      location: process.env.GOOGLE_LOCATION || 'us-central1',
    });

    console.log(`[VertexAI] Service initialized with model: ${this.modelName}`);
  }

  /**
   * @deprecated Método genérico removido - use apenas generateResponseWithPersona()
   */
  async generateResponse(
    userMessage: string,
    contactName?: string,
    _conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    throw new Error('Generic AI responses are disabled. Please assign an AI persona to the conversation.');
  }

  async generateResponseWithPersona(
    userMessage: string,
    contactName: string | undefined,
    conversationHistory: ChatMessage[],
    persona: any
  ): Promise<string> {
    try {
      console.log(`[VertexAI] Generating response with persona: ${persona.name} (Model: ${this.modelName})`);
      console.log(`[VertexAI] Message: ${userMessage.substring(0, 50)}`);

      let systemPrompt: string;
      const detectedLanguage = detectLanguage(userMessage);

      if (persona.useRag) {
        const promptSections = await getPersonaPromptSections(persona.id, detectedLanguage);
        if (promptSections.length > 0) {
          const contextInfo = contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
          systemPrompt = INTERNAL_RULES + '\n\n' + assembleDynamicPrompt(promptSections, contextInfo);
        } else {
          systemPrompt = INTERNAL_RULES + '\n\n' + (persona.systemPrompt || `Você é ${persona.name}.`);
          systemPrompt += contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
        }
      } else {
        systemPrompt = INTERNAL_RULES + '\n\n' + (persona.systemPrompt || `Você é ${persona.name}.`);
        systemPrompt += contactName ? `\n\nCONTEXTO DO CONTATO:\n- Nome: ${contactName}` : '';
      }

      // Adapter: Convert OpenAI Messages to Gemini Content
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt
      });

      // Map history to Gemini format (skipping system message as it's passed in init)
      const history = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

      // Add current user message
      const chat = generativeModel.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: persona.maxOutputTokens || 500,
          temperature: persona.temperature ? parseFloat(persona.temperature.toString()) : 0.7,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const responseText = response.candidates?.[0].content.parts[0].text || 'Desculpe, momento de silêncio.';

      console.log(`[VertexAI] Response generated:`, responseText.substring(0, 50));
      return responseText;

    } catch (error) {
      console.error('[VertexAI] Error generating response:', error);
      // Fallback or rethrow
      return "Desculpe, estou consultando algumas informações. Pode repetir?";
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple probe
      const model = this.vertexAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent('ping');
      return !!result.response;
    } catch (error) {
      console.error('[VertexAI] Service unavailable:', error);
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
