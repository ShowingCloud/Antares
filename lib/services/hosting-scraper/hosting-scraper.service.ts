/**
 * Main hosting scraper service that coordinates multiple scrapers
 */

import { RateLimiter } from './rate-limiter';
import { BaseScraper } from './scrapers/base-scraper';
import { TrustpilotScraper } from './scrapers/trustpilot-scraper';
import { HostingAdviceScraper } from './scrapers/hostingadvice-scraper';
import { G2Scraper } from './scrapers/g2-scraper';
import {
  HostingReview,
  HostingPricing,
  ScrapingResult,
  ScraperConfig,
  ScraperError,
} from './types';

export class HostingScraperService {
  private scrapers: BaseScraper[];
  private rateLimiter: RateLimiter;
  private config: ScraperConfig;

  constructor(config: ScraperConfig = {}) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimitDelay || 2000);

    // Initialize scrapers
    this.scrapers = [
      new TrustpilotScraper(config),
      new HostingAdviceScraper(config),
      new G2Scraper(config),
    ];
  }

  /**
   * Scrape reviews from all configured scrapers
   */
  async scrapeReviews(
    serviceName: string,
    options?: {
      sources?: string[];
      urls?: Record<string, string>;
    }
  ): Promise<HostingReview[]> {
    const sources = options?.sources || this.scrapers.map((s) => s.getSourceName());
    const filteredScrapers = this.scrapers.filter((scraper) =>
      sources.includes(scraper.getSourceName())
    );

    const results = await Promise.allSettled(
      filteredScrapers.map((scraper) =>
        this.rateLimiter.execute(() =>
          scraper.scrapeReviews(serviceName, options?.urls?.[scraper.getSourceName()])
        )
      )
    );

    const reviews: HostingReview[] = [];
    const errors: ScraperError[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        reviews.push(...result.value);
      } else {
        const scraper = filteredScrapers[index];
        errors.push({
          message: result.reason?.message || 'Unknown error',
          source: scraper.getSourceName(),
          timestamp: new Date(),
        });
        console.error(
          `Failed to scrape reviews from ${scraper.getSourceName()}:`,
          result.reason
        );
      }
    });

    if (errors.length > 0 && reviews.length === 0) {
      throw new Error(
        `All scrapers failed: ${errors.map((e) => `${e.source}: ${e.message}`).join('; ')}`
      );
    }

    // Remove duplicates based on content similarity
    return this.deduplicateReviews(reviews);
  }

  /**
   * Scrape pricing from all configured scrapers
   */
  async scrapePricing(
    serviceName: string,
    options?: {
      sources?: string[];
      urls?: Record<string, string>;
    }
  ): Promise<HostingPricing[]> {
    const sources = options?.sources || this.scrapers.map((s) => s.getSourceName());
    const filteredScrapers = this.scrapers.filter((scraper) =>
      sources.includes(scraper.getSourceName())
    );

    const results = await Promise.allSettled(
      filteredScrapers.map((scraper) =>
        this.rateLimiter.execute(() =>
          scraper.scrapePricing(serviceName, options?.urls?.[scraper.getSourceName()])
        )
      )
    );

    const pricing: HostingPricing[] = [];
    const errors: ScraperError[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        pricing.push(...result.value);
      } else {
        const scraper = filteredScrapers[index];
        errors.push({
          message: result.reason?.message || 'Unknown error',
          source: scraper.getSourceName(),
          timestamp: new Date(),
        });
        console.error(
          `Failed to scrape pricing from ${scraper.getSourceName()}:`,
          result.reason
        );
      }
    });

    if (errors.length > 0 && pricing.length === 0) {
      throw new Error(
        `All scrapers failed: ${errors.map((e) => `${e.source}: ${e.message}`).join('; ')}`
      );
    }

    // Remove duplicates
    return this.deduplicatePricing(pricing);
  }

  /**
   * Scrape both reviews and pricing from all sources
   */
  async scrapeAll(
    serviceName: string,
    options?: {
      sources?: string[];
      urls?: Record<string, string>;
    }
  ): Promise<ScrapingResult[]> {
    const sources = options?.sources || this.scrapers.map((s) => s.getSourceName());
    const filteredScrapers = this.scrapers.filter((scraper) =>
      sources.includes(scraper.getSourceName())
    );

    const results: ScrapingResult[] = [];

    for (const scraper of filteredScrapers) {
      try {
        const [reviews, pricing] = await Promise.all([
          this.rateLimiter.execute(() =>
            scraper.scrapeReviews(serviceName, options?.urls?.[scraper.getSourceName()])
          ),
          this.rateLimiter.execute(() =>
            scraper.scrapePricing(serviceName, options?.urls?.[scraper.getSourceName()])
          ),
        ]);

        results.push({
          reviews,
          pricing,
          serviceName,
          source: scraper.getSourceName(),
          scrapedAt: new Date(),
          success: true,
        });
      } catch (error) {
        results.push({
          reviews: [],
          pricing: [],
          serviceName,
          source: scraper.getSourceName(),
          scrapedAt: new Date(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Get available scraper sources
   */
  getAvailableSources(): string[] {
    return this.scrapers.map((scraper) => scraper.getSourceName());
  }

  /**
   * Add a custom scraper
   */
  addScraper(scraper: BaseScraper): void {
    this.scrapers.push(scraper);
  }

  /**
   * Remove a scraper by source name
   */
  removeScraper(sourceName: string): void {
    this.scrapers = this.scrapers.filter(
      (scraper) => scraper.getSourceName() !== sourceName
    );
  }

  /**
   * Remove duplicate reviews based on content similarity
   */
  private deduplicateReviews(reviews: HostingReview[]): HostingReview[] {
    const seen = new Set<string>();
    const unique: HostingReview[] = [];

    for (const review of reviews) {
      // Create a signature based on content and author
      const signature = `${review.author.toLowerCase()}-${review.content.substring(0, 50).toLowerCase()}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(review);
      }
    }

    return unique;
  }

  /**
   * Remove duplicate pricing plans
   */
  private deduplicatePricing(pricing: HostingPricing[]): HostingPricing[] {
    const seen = new Set<string>();
    const unique: HostingPricing[] = [];

    for (const plan of pricing) {
      const signature = `${plan.serviceName.toLowerCase()}-${plan.planName.toLowerCase()}-${plan.price}`;
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(plan);
      }
    }

    return unique;
  }
}

