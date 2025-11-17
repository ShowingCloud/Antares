/**
 * Admin API: Get all services
 * GET /api/admin/services
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

    const services = await prisma.hostingService.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        pricing: true,
        affiliateLink: true,
        lastUpdated: true,
        _count: {
          select: {
            reviews: true,
            metrics: true,
          },
        },
      },
      orderBy: {
        lastUpdated: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return createErrorResponse(error, 500);
  }
}

