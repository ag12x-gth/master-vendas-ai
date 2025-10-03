import { NextResponse } from 'next/server';
import { meetingBaasService } from '@/services/meeting-baas.service';
import { getUserSession } from '@/app/actions';

export async function POST() {
    try {
        const { user, error } = await getUserSession();
        
        if (!user || !user.id) {
            return NextResponse.json(
                { error: error || 'Usuário não autenticado' },
                { status: 401 }
            );
        }

        const meetingLink = await meetingBaasService.generateGoogleMeetLink();

        return NextResponse.json({
            success: true,
            meetingLink,
        });
    } catch (error) {
        console.error('Erro ao gerar link do Google Meet:', error);
        return NextResponse.json(
            { error: 'Erro ao gerar link do Google Meet' },
            { status: 500 }
        );
    }
}
