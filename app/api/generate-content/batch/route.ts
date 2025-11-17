/**
 * Next.js API Route: Batch Generate Content
 * 
 * POST /api/generate-content/batch
 * 
 * Triggers content generation for multiple hosting services
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContentOrchestratorService } from '@/lib/services/content-orchestrator';
import { verifyApiKey, verifyAdminAuth } from '@/lib/auth/api-auth';
import { createErrorResponse, createAuthErrorResponse, createValidationErrorResponse } from '@/lib/api/error-handler';
import { apiRateLimiter, getClientIdentifier } from '@/lib/api/rate-limiter';
import { z } from 'zod';

// Request body schema for batch operations
const BatchGenerateContentSchema = z.object({
  services: z.array(
    z.object({
      serviceName: z.string().min(1).max(100),
      cjAdvertiserId: z.string().optional(),
      categories: z.array(z.string()).optional(),
      generateAIReview: z.boolean().optional().default(true),
      scrapeReviews: z.boolean().optional().default(true),
      scrapePricing: z.boolean().optional().default(true),
      targetKeywords: z.array(z.string()).optional(),
      customInstructions: z.string().optional(),
      skipExisting: z.boolean().optional().default(false),
    })
  ).min(1).max(10), // Limit to 10 services per batch
});

type BatchGenerateContentRequest = z.infer<typeof BatchGenerateContentSchema>;

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
 * POST handler - Batch generate content for multiple services
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for batch operations)
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

    // Admin authentication required for batch operations
    const authResult = verifyAdminAuth(request);
    if (!authResult.authenticated) {
      return createAuthErrorResponse(
        authResult.error || 'Admin authentication required for batch operations'
      );
    }

    // Parse and validate request body
    let body: BatchGenerateContentRequest;
    try {
      const rawBody = await request.json();
      body = BatchGenerateContentSchema.parse(rawBody);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(
          'Invalid request body',
          error.errors
        );
      }
      return createValidationErrorResponse('Invalid JSON in request body');
    }

    // Validate services array
    if (!body.services || body.services.length === 0) {
      return createValidationErrorResponse('services array is required and cannot be empty');
    }

    if (body.services.length > 10) {
      return createValidationErrorResponse('Maximum 10 services allowed per batch request');
    }

    // Initialize orchestrator
    const orchestrator = getOrchestratorService();

    try {
      // Trigger batch content generation
      const results = await orchestrator.batchOrchestrate(
        body.services.map((service) => ({
          serviceName: service.serviceName.trim(),
          cjAdvertiserId: service.cjAdvertiserId,
          categories: service.categories,
          generateAIReview: service.generateAIReview,
          scrapeReviews: service.scrapeReviews,
          scrapePricing: service.scrapePricing,
          targetKeywords: service.targetKeywords,
          customInstructions: service.customInstructions,
          skipExisting: service.skipExisting,
        }))
      );

      // Cleanup
      await orchestrator.disconnect();

      // Calculate summary statistics
      const summary = {
        total: results.length,
        successful: results.filter((r) => r.errors.length === 0).length,
        failed: results.filter((r) => r.errors.length > 0).length,
        totalReviewsCreated: results.reduce((sum, r) => sum + r.reviewsCreated, 0),
        totalMetricsCreated: results.reduce((sum, r) => sum + r.metricsCreated, 0),
        aiReviewsGenerated: results.filter((r) => r.aiReviewGenerated).length,
      };

      // Return success response
      return NextResponse.json(
        {
          success: true,
          summary,
          results,
          message: `Batch content generation completed: ${summary.successful}/${summary.total} successful`,
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
    console.error('Batch content generation error:', error);
    return createErrorResponse(error, 500);
  }
}

