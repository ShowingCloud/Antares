/**
 * TypeScript types for content orchestration service
 */

import { Prisma } from '@prisma/client';

export interface OrchestrationConfig {
  cjApi?: {
    personalAccessToken: string;
    companyId: string;
    propertyId: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  scraper?: {
    rateLimitDelay?: number;
    timeout?: number;
    retries?: number;
  };
  database?: {
    enableAutoSave?: boolean;
  };
}

export interface ServiceData {
  name: string;
  slug: string;
  description?: string;
  features?: string[];
  pricing?: string;
  cjAdvertiserId?: string;
  affiliateLink?: string;
}

export interface OrchestrationResult {
  hostingService: {
    id: string;
    name: string;
    slug: string;
  };
  reviewsCreated: number;
  metricsCreated: number;
  aiReviewGenerated: boolean;
  sources: {
    cjApi: boolean;
    webScraping: boolean;
    aiGeneration: boolean;
  };
  errors: OrchestrationError[];
}

export interface OrchestrationError {
  source: 'cj-api' | 'web-scraping' | 'ai-generation' | 'database';
  message: string;
  timestamp: Date;
  serviceName?: string;
}

export interface OrchestrationOptions {
  serviceName: string;
  cjAdvertiserId?: string;
  categories?: string[];
  generateAIReview?: boolean;
  scrapeReviews?: boolean;
  scrapePricing?: boolean;
  targetKeywords?: string[];
  customInstructions?: string;
  skipExisting?: boolean;
}

export type HostingServiceWithRelations = Prisma.HostingServiceGetPayload<{
  include: {
    reviews: true;
    metrics: true;
  };
}>;

