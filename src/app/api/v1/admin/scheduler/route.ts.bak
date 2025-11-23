import { NextResponse } from 'next/server';
import {
  startReportScheduler,
  stopReportScheduler,
  getSchedulerStatus,
} from '@/lib/notifications/report-scheduler';

export async function POST() {
  try {
    startReportScheduler();

    return NextResponse.json({
      success: true,
      message: 'Report scheduler started',
      status: getSchedulerStatus(),
    });
  } catch (error) {
    console.error('[AdminScheduler] Error starting scheduler:', error);
    return NextResponse.json(
      {
        error: 'Failed to start scheduler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    stopReportScheduler();

    return NextResponse.json({
      success: true,
      message: 'Report scheduler stopped',
      status: getSchedulerStatus(),
    });
  } catch (error) {
    console.error('[AdminScheduler] Error stopping scheduler:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop scheduler',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[AdminScheduler] Error getting scheduler status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get scheduler status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
