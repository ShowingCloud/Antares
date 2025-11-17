/**
 * Admin API: Get dashboard statistics
 * GET /api/admin/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/auth/api-auth';
import { createErrorResponse, createAuthErrorResponse } from '@/lib/api/error-handler';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = verifyApiKey(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed');
    }

    // Get counts
    const [
      totalServices,
      totalReviews,
      totalMetrics,
      servicesWithAIReviews,
      servicesWithAffiliateLinks,
    ] = await Promise.all([
      prisma.hostingService.count(),
      prisma.review.count(),
      prisma.comparisonMetric.count(),
      prisma.hostingService.count({
        where: {
          reviews: {
            some: {
              author: 'AI Generated Review',
            },
          },
        },
      }),
      prisma.hostingService.count({
        where: {
          affiliateLink: {
            not: null,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalServices,
      totalReviews,
      totalMetrics,
      servicesWithAIReviews,
      servicesWithAffiliateLinks,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return createErrorResponse(error, 500);
  }
}

