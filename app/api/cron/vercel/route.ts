/**
 * Vercel Cron API Route
 * 
 * This route is called by Vercel Cron based on vercel.json configuration
 * No authentication required as Vercel handles it
 */

import { NextRequest, NextResponse } from 'next/server';
import { CronManager } from '@/lib/cron/cron-manager';

// Initialize cron manager
const cronManager = new CronManager((message) => {
  console.log(`[Vercel Cron] ${new Date().toISOString()} - ${message}`);
});

/**
 * GET handler - Called by Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    // Get job name from Authorization header (Vercel Cron sets this)
    const authHeader = request.headers.get('authorization');
    const jobName = authHeader?.replace('Bearer ', '') || 
                   request.nextUrl.searchParams.get('job') ||
                   'update-services'; // Default job

    console.log(`[Vercel Cron] Executing job: ${jobName}`);

    // Execute the job
    const result = await cronManager.executeJob(jobName);

    return NextResponse.json({
      success: result.success,
      job: result.jobName,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Vercel Cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

