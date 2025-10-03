import { getBaseUrl } from '@/utils/get-base-url';

const MEETING_BAAS_API_KEY = process.env.MEETING_BAAS_API_KEY;
const MEETING_BAAS_API_URL = 'https://api.meetingbaas.com/bots';

if (!MEETING_BAAS_API_KEY) {
    throw new Error('MEETING_BAAS_API_KEY não está configurada');
}

export interface JoinMeetingParams {
    googleMeetUrl: string;
    botName?: string;
    recordingMode?: 'speaker_view' | 'gallery_view' | 'audio_only';
    enableTranscription?: boolean;
    webhookUrl?: string;
}

export interface MeetingBotInfo {
    botId: string;
    meetingUrl: string;
    status: string;
    joinedAt?: string;
}

export class MeetingBaasService {
    private validateGoogleMeetUrl(url: string): boolean {
        const meetUrlPattern = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i;
        return meetUrlPattern.test(url);
    }

    private cleanGoogleMeetUrl(url: string): string {
        const match = url.match(/^(https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3})/i);
        return match?.[1] || url;
    }

    async joinMeeting(params: JoinMeetingParams): Promise<MeetingBotInfo> {
        const { googleMeetUrl, botName = 'Assistente IA', recordingMode = 'speaker_view', enableTranscription = true, webhookUrl } = params;

        if (!this.validateGoogleMeetUrl(googleMeetUrl)) {
            throw new Error('URL do Google Meet inválida. Use o formato: https://meet.google.com/abc-defg-hij');
        }

        const cleanUrl = this.cleanGoogleMeetUrl(googleMeetUrl);

        try {
            // Configurar webhook URL - OBRIGATÓRIO pela Meeting BaaS API
            const baseUrl = getBaseUrl();
            const defaultWebhookUrl = `${baseUrl}/api/v1/meetings/webhook`;

            const requestBody: any = {
                meeting_url: cleanUrl,
                bot_name: botName,
                recording_mode: recordingMode,
                webhook_url: webhookUrl || defaultWebhookUrl, // OBRIGATÓRIO
            };

            if (enableTranscription) {
                requestBody.speech_to_text = {
                    provider: 'Default'
                };
            }

            console.log('Enviando requisição para Meeting BaaS:', {
                url: MEETING_BAAS_API_URL,
                body: requestBody
            });

            const response = await fetch(MEETING_BAAS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-meeting-baas-api-key': MEETING_BAAS_API_KEY!,
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Resposta Meeting BaaS:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Erro na resposta da API:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorData
                });
                throw new Error(`API retornou erro ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            console.log('Bot criado com sucesso:', data);

            return {
                botId: data.bot_id,
                meetingUrl: cleanUrl,
                status: 'joining',
                joinedAt: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('=== ERRO COMPLETO MEETING BAAS ===');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            throw new Error(`Erro ao entrar na reunião: ${error.message}`);
        }
    }

    async leaveMeeting(botId: string): Promise<void> {
        try {
            const response = await fetch(`${MEETING_BAAS_API_URL}/${botId}`, {
                method: 'DELETE',
                headers: {
                    'x-meeting-baas-api-key': MEETING_BAAS_API_KEY!,
                },
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Erro ao remover bot: ${response.status} - ${errorData}`);
            }

            console.log('Bot removido com sucesso:', botId);
        } catch (error: any) {
            console.error('Erro ao sair da reunião:', error);
            throw error;
        }
    }

    async getMeetingData(botId: string): Promise<any> {
        try {
            const response = await fetch(`${MEETING_BAAS_API_URL}/${botId}`, {
                method: 'GET',
                headers: {
                    'x-meeting-baas-api-key': MEETING_BAAS_API_KEY!,
                },
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Erro ao buscar dados: ${response.status} - ${errorData}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('Erro ao buscar dados da reunião:', error);
            return null;
        }
    }

    async getBotStatus(botId: string): Promise<any> {
        const data = await this.getMeetingData(botId);
        return {
            status: data?.status || 'unknown',
            botId,
            data
        };
    }
}

export const meetingBaasService = new MeetingBaasService();
