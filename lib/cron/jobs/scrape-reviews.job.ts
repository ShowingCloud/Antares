/**
 * Cron job: Scrape new reviews
 * 
 * Scrapes new reviews from web sources for existing services
 */

import { PrismaClient } from '@prisma/client';
import { HostingScraperService } from '@/lib/services/hosting-scraper';
import { CronJobContext, CronJobResult, CronJobError } from '../types';

export class ScrapeReviewsJob {
  private prisma: PrismaClient;
  private scraper: HostingScraperService;

  constructor() {
    this.prisma = new PrismaClient();
    this.scraper = new HostingScraperService({
      rateLimitDelay: 2000,
    });
  }

  async execute(context: CronJobContext): Promise<CronJobResult> {
    const errors: CronJobError[] = [];
    let recordsProcessed = 0;
    let recordsUpdated = 0;

    try {
      context.logger?.(`Starting ${context.jobName}...`);

      // Get all services
      const services = await this.prisma.hostingService.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          lastUpdated: 'asc',
        },
        take: 20, // Limit to 20 services per run
      });

      context.logger?.(`Found ${services.length} services to scrape`);

      recordsProcessed = services.length;

      for (const service of services) {
        try {
          context.logger?.(`Scraping reviews for: ${service.name}`);

          const reviews = await this.scraper.scrapeReviews(service.name);

          // Store new reviews
          let newReviewsCount = 0;
          for (const review of reviews) {
            // Check if review already exists (by content hash)
            const contentHash = this.hashContent(review.content);
            const existing = await this.prisma.review.findFirst({
              where: {
                serviceId: service.id,
                content: {
                  contains: review.content.substring(0, 50), // Simple duplicate check
                },
              },
            });

            if (!existing) {
              await this.prisma.review.create({
                data: {
                  serviceId: service.id,
                  content: review.content,
                  rating: review.rating,
                  author: review.author || null,
                  createdAt: review.date instanceof Date ? review.date : new Date(review.date),
                },
              });
              newReviewsCount++;
            }
          }

          if (newReviewsCount > 0) {
            recordsUpdated += newReviewsCount;
            context.logger?.(`✓ Added ${newReviewsCount} new reviews for ${service.name}`);
          } else {
            context.logger?.(`- No new reviews found for ${service.name}`);
          }

          // Update service lastUpdated timestamp
          await this.prisma.hostingService.update({
            where: { id: service.id },
            data: { lastUpdated: new Date() },
          });

          // Add delay between services
          if (services.indexOf(service) < services.length - 1) {
            await this.sleep(3000);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            message: `Failed to scrape reviews for ${service.name}: ${errorMessage}`,
            serviceName: service.name,
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined,
          });
          context.logger?.(`✗ Failed to scrape reviews for ${service.name}: ${errorMessage}`);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - context.startTime.getTime();

      return {
        jobName: context.jobName,
        success: errors.length === 0 || recordsUpdated > 0,
        startTime: context.startTime,
        endTime,
        duration,
        recordsProcessed,
        recordsUpdated,
        errors,
        message: `Scraped ${recordsUpdated} new reviews from ${recordsProcessed} services`,
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - context.startTime.getTime();

      errors.push({
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        jobName: context.jobName,
        success: false,
        startTime: context.startTime,
        endTime,
        duration,
        recordsProcessed,
        recordsUpdated,
        errors,
        message: 'Job failed with errors',
      };
    } finally {
      await this.cleanup();
    }
  }

  private hashContent(content: string): string {
    // Simple hash for duplicate detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

