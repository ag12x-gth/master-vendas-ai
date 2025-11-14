import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/app/actions';
import { analyticsService } from '@/services/analytics.service';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getUserSession();

    if (!user?.companyId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const campaigns = await analyticsService.getCampaignMetrics(user.companyId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    const notifications = await analyticsService.getNotificationMetrics(user.companyId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return NextResponse.json({ campaigns, notifications });
  } catch (error) {
    console.error('[Analytics Campaigns] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign metrics', details: (error as Error).message },
      { status: 500 }
    );
  }
}
