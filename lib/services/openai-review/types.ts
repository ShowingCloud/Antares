/**
 * TypeScript types for AI-generated hosting reviews
 */

export interface SEOReview {
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  rating: number; // 1-5 scale
  metadata: ReviewMetadata;
}

export interface ReviewMetadata {
  serviceName: string;
  keywords: string[];
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  wordCount: number;
  readabilityScore?: number;
  generatedAt: Date | string;
  model?: string;
}

export interface ReviewGenerationOptions {
  serviceName: string;
  serviceDescription?: string;
  features?: string[];
  pricing?: string;
  targetKeywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  includeComparison?: boolean;
  competitorNames?: string[];
  customInstructions?: string;
}

export interface OpenAIReviewConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ReviewGenerationError {
  message: string;
  code?: string;
  timestamp: Date;
  serviceName?: string;
}

