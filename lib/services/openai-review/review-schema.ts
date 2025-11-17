/**
 * Zod schema for validating AI-generated review JSON structure
 */

import { z } from 'zod';

export const ReviewMetadataSchema = z.object({
  serviceName: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
  wordCount: z.number().int().positive(),
  readabilityScore: z.number().min(0).max(100).optional(),
  generatedAt: z.string().or(z.date()),
  model: z.string().optional(),
});

export const SEOReviewSchema = z.object({
  title: z.string().min(10).max(120),
  content: z.string().min(200),
  pros: z.array(z.string()).min(3).max(10),
  cons: z.array(z.string()).min(1).max(10),
  rating: z.number().min(1).max(5),
  metadata: ReviewMetadataSchema,
});

export type ValidatedSEOReview = z.infer<typeof SEOReviewSchema>;
export type ValidatedReviewMetadata = z.infer<typeof ReviewMetadataSchema>;

