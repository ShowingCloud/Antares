/**
 * Next.js API Route: Cron Jobs
 * 
 * Handles cron job execution via API (for Vercel Cron or external cron services)
 * 
 * GET /api/cron?job=update-services
 */

import { NextRequest, NextResponse } from 'next/server';
import { CronManager } from '@/lib/cron/cron-manager';
import { verifyApiKey } from '@/lib/auth/api-auth';
import { createErrorResponse, createAuthErrorResponse } from '@/lib/api/error-handler';

// Initialize cron manager
const cronManager = new CronManager((message) => {
  console.log(`[Cron] ${new Date().toISOString()} - ${message}`);
});

/**
 * GET handler - Execute a cron job
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = verifyApiKey(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed');
    }

    const searchParams = request.nextUrl.searchParams;
    const jobName = searchParams.get('job');

    if (!jobName) {
      return NextResponse.json(
        {
          error: 'Job name required. Use ?job=update-services',
          availableJobs: cronManager.getJobs().map((j) => ({
            name: j.name,
            description: j.description,
            enabled: j.enabled,
          })),
        },
        { status: 400 }
      );
    }

    // Get job options from query params
    const options: any = {};
    const maxAge = searchParams.get('maxAge');
    if (maxAge) {
      options.maxAge = parseInt(maxAge);
    }
    const forceUpdate = searchParams.get('forceUpdate') === 'true';
    if (forceUpdate) {
      options.forceUpdate = true;
    }
    const skipAIReview = searchParams.get('skipAIReview') === 'true';
    if (skipAIReview) {
      options.skipAIReview = true;
    }
    const skipScraping = searchParams.get('skipScraping') === 'true';
    if (skipScraping) {
      options.skipScraping = true;
    }

    // Execute the job
    const result = await cronManager.executeJob(jobName, options);

    return NextResponse.json({
      success: result.success,
      job: result.jobName,
      result,
    });
  } catch (error) {
    console.error('Cron job execution error:', error);
    return createErrorResponse(error, 500);
  }
}

/**
 * POST handler - Execute a cron job with options
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authResult = verifyApiKey(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed');
    }

    const body = await request.json().catch(() => ({}));
    const { job, options } = body;

    if (!job) {
      return NextResponse.json(
        {
          error: 'Job name required in request body',
          availableJobs: cronManager.getJobs().map((j) => ({
            name: j.name,
            description: j.description,
            enabled: j.enabled,
          })),
        },
        { status: 400 }
      );
    }

    // Execute the job
    const result = await cronManager.executeJob(job, options || {});

    return NextResponse.json({
      success: result.success,
      job: result.jobName,
      result,
    });
  } catch (error) {
    console.error('Cron job execution error:', error);
    return createErrorResponse(error, 500);
  }
}

