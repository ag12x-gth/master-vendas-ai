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
    async joinMeeting(params: JoinMeetingParams): Promise<MeetingBotInfo> {
        const { googleMeetUrl, botName = 'Assistente IA', recordingMode = 'speaker_view', enableTranscription = true, webhookUrl } = params;

        const { success, data, error } = await baasClient.joinMeeting({
            bot_name: botName,
            meeting_url: googleMeetUrl,
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
            meetingUrl: googleMeetUrl,
            status: 'joining',
            joinedAt: new Date().toISOString(),
        };
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
