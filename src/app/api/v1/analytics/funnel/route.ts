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
    const boardId = searchParams.get('boardId');

    const funnel = await analyticsService.getFunnelData(user.companyId, boardId || undefined);

    return NextResponse.json(funnel);
  } catch (error) {
    console.error('[Analytics Funnel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
