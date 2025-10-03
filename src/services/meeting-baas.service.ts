import { createBaasClient } from "@meeting-baas/sdk";

const MEETING_BAAS_API_KEY = process.env.MEETING_BAAS_API_KEY;

if (!MEETING_BAAS_API_KEY) {
    throw new Error('MEETING_BAAS_API_KEY não está configurada');
}

const baasClient = createBaasClient({
    api_key: MEETING_BAAS_API_KEY,
});

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

    async generateGoogleMeetLink(): Promise<string> {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        
        return `https://meet.google.com/${part1}-${part2}-${part3}`;
    }

    async joinMeeting(params: JoinMeetingParams): Promise<MeetingBotInfo> {
        const { googleMeetUrl, botName = 'Assistente IA', recordingMode = 'speaker_view', enableTranscription = true, webhookUrl } = params;

        if (!this.validateGoogleMeetUrl(googleMeetUrl)) {
            throw new Error('URL do Google Meet inválida. Use o formato: https://meet.google.com/abc-defg-hij');
        }

        const cleanUrl = this.cleanGoogleMeetUrl(googleMeetUrl);

        try {
            const { success, data, error } = await baasClient.joinMeeting({
            bot_name: botName,
            meeting_url: cleanUrl,
            reserved: false,
            recording_mode: recordingMode,
            speech_to_text: enableTranscription ? {
                provider: 'Default'
            } : undefined,
            bot_image: undefined,
            entry_message: 'Gravação e análise iniciada',
            automatic_leave: {
                waiting_room_timeout: 600,
                noone_joined_timeout: 300,
            },
            ...(webhookUrl && {
                webhooks: {
                    all_events: webhookUrl,
                }
            })
        });

        if (!success || !data) {
            throw new Error(`Erro ao entrar na reunião: ${error || 'Erro desconhecido'}`);
        }

            return {
                botId: data.bot_id,
                meetingUrl: cleanUrl,
                status: 'joining',
                joinedAt: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('Erro detalhado ao criar reunião:', error.response?.data || error.message);
            throw new Error(`Erro ao entrar na reunião: ${error.response?.data?.message || error.message || 'Erro desconhecido'}`);
        }
    }

    async leaveMeeting(uuid: string): Promise<void> {
        try {
            const { success, error } = await baasClient.leaveMeeting({
                uuid: uuid,
            });

            if (!success) {
                throw new Error(`Erro ao sair da reunião: ${error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao sair da reunião:', error);
            throw error;
        }
    }

    async getMeetingData(botId: string): Promise<any> {
        return null;
    }

    async getBotStatus(botId: string): Promise<any> {
        return {
            status: 'unknown',
            botId,
        };
    }
}

export const meetingBaasService = new MeetingBaasService();
