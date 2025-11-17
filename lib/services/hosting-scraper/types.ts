/**
 * TypeScript types for hosting review and pricing data
 */

export interface HostingReview {
  id?: string;
  author: string;
  rating: number; // 1-5 scale
  content: string;
  date: Date | string;
  verified?: boolean;
  source: string; // Review site name
  sourceUrl?: string;
  serviceName?: string;
}

export interface HostingPricing {
  planName: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one-time';
  features: string[];
  promotionalPrice?: number;
  regularPrice?: number;
  serviceName: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: Date | string;
}

export interface ScrapingResult {
  reviews: HostingReview[];
  pricing: HostingPricing[];
  serviceName: string;
  source: string;
  scrapedAt: Date;
  success: boolean;
  error?: string;
}

export interface ScraperConfig {
  rateLimitDelay?: number; // milliseconds between requests
  timeout?: number; // request timeout in milliseconds
  retries?: number; // number of retry attempts
  retryDelay?: number; // delay between retries in milliseconds
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface ScraperError {
  message: string;
  source: string;
  url?: string;
  statusCode?: number;
  timestamp: Date;
}

