/**
 * Next.js API Route: Generate Content
 * 
 * POST /api/generate-content
 * 
 * Triggers the content generation pipeline for a hosting service
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContentOrchestratorService } from '@/lib/services/content-orchestrator';
import { verifyApiKey } from '@/lib/auth/api-auth';
import { createErrorResponse, createAuthErrorResponse, createValidationErrorResponse } from '@/lib/api/error-handler';
import { apiRateLimiter, getClientIdentifier } from '@/lib/api/rate-limiter';
import { z } from 'zod';

// Request body schema
const GenerateContentSchema = z.object({
  serviceName: z.string().min(1).max(100),
  cjAdvertiserId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  generateAIReview: z.boolean().optional().default(true),
  scrapeReviews: z.boolean().optional().default(true),
  scrapePricing: z.boolean().optional().default(true),
  targetKeywords: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  skipExisting: z.boolean().optional().default(false),
});

type GenerateContentRequest = z.infer<typeof GenerateContentSchema>;

/**
 * Initialize orchestrator service
 */
function getOrchestratorService(): ContentOrchestratorService {
  return new ContentOrchestratorService({
    cjApi: process.env.CJ_PERSONAL_ACCESS_TOKEN
      ? {
          personalAccessToken: process.env.CJ_PERSONAL_ACCESS_TOKEN,
          companyId: process.env.CJ_COMPANY_ID!,
          propertyId: process.env.CJ_PROPERTY_ID!,
        }
      : undefined,
    openai: process.env.OPENAI_API_KEY
      ? {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          temperature: process.env.OPENAI_TEMPERATURE
            ? parseFloat(process.env.OPENAI_TEMPERATURE)
            : 0.7,
          maxTokens: process.env.OPENAI_MAX_TOKENS
            ? parseInt(process.env.OPENAI_MAX_TOKENS)
            : 4000,
        }
      : undefined,
    scraper: {
      rateLimitDelay: process.env.SCRAPER_RATE_LIMIT_DELAY
        ? parseInt(process.env.SCRAPER_RATE_LIMIT_DELAY)
        : 2000,
      timeout: process.env.SCRAPER_TIMEOUT
        ? parseInt(process.env.SCRAPER_TIMEOUT)
        : 30000,
      retries: process.env.SCRAPER_RETRIES
        ? parseInt(process.env.SCRAPER_RETRIES)
        : 3,
    },
    database: {
      enableAutoSave: true,
    },
  });
}

/**
 * POST handler - Generate content for a hosting service
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = apiRateLimiter.isAllowed(clientId);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: new Date(rateLimit.resetTime).toISOString(),
          timestamp: new Date().toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Authentication
    const authResult = verifyApiKey(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed');
    }

    // Parse and validate request body
    let body: GenerateContentRequest;
    try {
      const rawBody = await request.json();
      body = GenerateContentSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(
          'Invalid request body',
          error.errors
        );
      }
      return createValidationErrorResponse('Invalid JSON in request body');
    }

    // Validate service name
    if (!body.serviceName || body.serviceName.trim().length === 0) {
      return createValidationErrorResponse('serviceName is required');
    }

    // Initialize orchestrator
    const orchestrator = getOrchestratorService();

    try {
      // Trigger content generation
      const result = await orchestrator.orchestrate({
        serviceName: body.serviceName.trim(),
        cjAdvertiserId: body.cjAdvertiserId,
        categories: body.categories,
        generateAIReview: body.generateAIReview,
        scrapeReviews: body.scrapeReviews,
        scrapePricing: body.scrapePricing,
        targetKeywords: body.targetKeywords,
        customInstructions: body.customInstructions,
        skipExisting: body.skipExisting,
      });

      // Cleanup
      await orchestrator.disconnect();

      // Return success response
      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Content generation completed successfully',
        },
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    } catch (orchestrationError) {
      // Cleanup on error
      await orchestrator.disconnect();
      throw orchestrationError;
    }
  } catch (error) {
    console.error('Content generation error:', error);
    return createErrorResponse(error, 500);
  }
}

/**
 * GET handler - Get service status or information
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const authResult = verifyApiKey(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(authResult.error || 'Authentication failed');
    }

    const searchParams = request.nextUrl.searchParams;
    const serviceName = searchParams.get('serviceName');
    const slug = searchParams.get('slug');

    if (!serviceName && !slug) {
      return createValidationErrorResponse(
        'Either serviceName or slug query parameter is required'
      );
    }

    const orchestrator = getOrchestratorService();

    try {
      const identifier = slug || serviceName!;
      const serviceData = await orchestrator.getServiceData(
        identifier.toLowerCase().replace(/\s+/g, '-')
      );

      await orchestrator.disconnect();

      if (!serviceData) {
        return NextResponse.json(
          {
            success: false,
            message: 'Service not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: serviceData,
      });
    } catch (error) {
      await orchestrator.disconnect();
      throw error;
    }
  } catch (error) {
    console.error('Get service error:', error);
    return createErrorResponse(error, 500);
  }
}

