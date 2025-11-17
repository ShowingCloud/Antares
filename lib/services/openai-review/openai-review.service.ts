/**
 * OpenAI service for generating SEO-optimized hosting reviews
 */

import { OpenAI } from 'openai';
import { z } from 'zod';
import {
  SEOReview,
  ReviewGenerationOptions,
  OpenAIReviewConfig,
  ReviewGenerationError,
} from './types';
import { SEOReviewSchema, ValidatedSEOReview } from './review-schema';
import { PromptBuilder } from './prompt-builder';

export class OpenAIReviewError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'OpenAIReviewError';
    Object.setPrototypeOf(this, OpenAIReviewError.prototype);
  }
}

/**
 * Service class for generating SEO-optimized hosting reviews using OpenAI GPT-4
 */
export class OpenAIReviewService {
  private client: OpenAI;
  private config: Required<Omit<OpenAIReviewConfig, 'apiKey'>> & {
    apiKey: string;
  };

  constructor(config: OpenAIReviewConfig) {
    if (!config.apiKey) {
      throw new OpenAIReviewError('OpenAI API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4000,
      timeout: config.timeout ?? 60000,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      maxRetries: 3,
    });
  }

  /**
   * Generate a single SEO-optimized hosting review
   */
  async generateReview(
    options: ReviewGenerationOptions
  ): Promise<ValidatedSEOReview> {
    try {
      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(options);

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new OpenAIReviewError('No content received from OpenAI');
      }

      // Parse and validate JSON
      let parsedContent: SEOReview;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[1]);
        } else {
          throw new OpenAIReviewError(
            `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }
      }

      // Enhance metadata
      parsedContent.metadata.wordCount = this.countWords(parsedContent.content);
      parsedContent.metadata.readabilityScore =
        PromptBuilder.calculateReadabilityScore(parsedContent.content);
      parsedContent.metadata.model = this.config.model;
      parsedContent.metadata.generatedAt = new Date().toISOString();

      // Extract additional keywords if not provided
      if (
        !parsedContent.metadata.keywords ||
        parsedContent.metadata.keywords.length === 0
      ) {
        parsedContent.metadata.keywords = PromptBuilder.extractKeywords(
          parsedContent.content,
          options.serviceName
        );
      }

      // Validate the review structure
      const validatedReview = SEOReviewSchema.parse(parsedContent);

      return validatedReview;
    } catch (error) {
      if (error instanceof OpenAIReviewError) {
        throw error;
      }

      if (error instanceof z.ZodError) {
        throw new OpenAIReviewError(
          `Review validation failed: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          'VALIDATION_ERROR',
          error
        );
      }

      if (error instanceof OpenAI.APIError) {
        throw new OpenAIReviewError(
          `OpenAI API error: ${error.message}`,
          error.code || 'API_ERROR',
          error
        );
      }

      throw new OpenAIReviewError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * Generate multiple reviews in batch
   */
  async generateBatchReviews(
    options: ReviewGenerationOptions[]
  ): Promise<ValidatedSEOReview[]> {
    const results: ValidatedSEOReview[] = [];
    const errors: ReviewGenerationError[] = [];

    // Process reviews sequentially to avoid rate limits
    for (const option of options) {
      try {
        const review = await this.generateReview(option);
        results.push(review);
        
        // Add delay between requests to respect rate limits
        if (options.indexOf(option) < options.length - 1) {
          await this.sleep(2000); // 2 second delay
        }
      } catch (error) {
        errors.push({
          message: error instanceof Error ? error.message : String(error),
          code: error instanceof OpenAIReviewError ? error.code : 'UNKNOWN',
          timestamp: new Date(),
          serviceName: option.serviceName,
        });
        console.error(`Failed to generate review for ${option.serviceName}:`, error);
      }
    }

    if (results.length === 0 && errors.length > 0) {
      throw new OpenAIReviewError(
        `All review generations failed: ${errors.map((e) => e.message).join('; ')}`
      );
    }

    return results;
  }

  /**
   * Generate a review with retry logic
   */
  async generateReviewWithRetry(
    options: ReviewGenerationOptions,
    maxRetries: number = 3
  ): Promise<ValidatedSEOReview> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateReview(options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors
        if (
          error instanceof OpenAIReviewError &&
          error.code === 'VALIDATION_ERROR'
        ) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = 1000 * attempt; // Exponential backoff
          await this.sleep(delay);
          console.warn(
            `Retry attempt ${attempt + 1}/${maxRetries} for ${options.serviceName}`
          );
        }
      }
    }

    throw new OpenAIReviewError(
      `Failed after ${maxRetries} attempts: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OpenAIReviewConfig>): void {
    if (config.apiKey) {
      this.config.apiKey = config.apiKey;
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout,
        maxRetries: 3,
      });
    }

    if (config.model) {
      this.config.model = config.model;
    }

    if (config.temperature !== undefined) {
      this.config.temperature = config.temperature;
    }

    if (config.maxTokens !== undefined) {
      this.config.maxTokens = config.maxTokens;
    }

    if (config.timeout !== undefined) {
      this.config.timeout = config.timeout;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }
}

