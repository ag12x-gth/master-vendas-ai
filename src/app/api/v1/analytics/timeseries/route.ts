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
    const granularity = (searchParams.get('granularity') as 'day' | 'week' | 'month') || 'day';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const timeseries = await analyticsService.getTimeSeriesData(
      user.companyId,
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      granularity
    );

    return NextResponse.json(timeseries);
  } catch (error) {
    console.error('[Analytics Timeseries] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time series data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
