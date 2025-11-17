/**
 * Cron job: Generate AI reviews for services without them
 * 
 * Generates AI reviews for services that don't have AI-generated reviews yet
 */

import { PrismaClient } from '@prisma/client';
import { ContentOrchestratorService } from '@/lib/services/content-orchestrator';
import { CronJobContext, CronJobResult, CronJobError } from '../types';

export class GenerateAIReviewsJob {
  private prisma: PrismaClient;
  private orchestrator: ContentOrchestratorService;

  constructor() {
    this.prisma = new PrismaClient();
    this.orchestrator = new ContentOrchestratorService({
      openai: process.env.OPENAI_API_KEY
        ? {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          }
        : undefined,
      scraper: {
        rateLimitDelay: 2000,
      },
    });
  }

  async execute(context: CronJobContext): Promise<CronJobResult> {
    const errors: CronJobError[] = [];
    let recordsProcessed = 0;
    let recordsUpdated = 0;

    try {
      context.logger?.(`Starting ${context.jobName}...`);

      // Get services without AI-generated reviews
      const services = await this.prisma.hostingService.findMany({
        where: {
          reviews: {
            none: {
              author: 'AI Generated Review',
            },
          },
        },
        take: 10, // Limit to 10 services per run
      });

      context.logger?.(`Found ${services.length} services without AI reviews`);

      recordsProcessed = services.length;

      for (const service of services) {
        try {
          context.logger?.(`Generating AI review for: ${service.name}`);

          const result = await this.orchestrator.orchestrate({
            serviceName: service.name,
            generateAIReview: true,
            scrapeReviews: false,
            scrapePricing: false,
            skipExisting: false,
          });

          if (result.aiReviewGenerated) {
            recordsUpdated++;
            context.logger?.(`✓ Generated AI review for ${service.name}`);
          } else {
            errors.push({
              message: `Failed to generate AI review for ${service.name}`,
              serviceName: service.name,
              timestamp: new Date(),
            });
            context.logger?.(`✗ Failed to generate AI review for ${service.name}`);
          }

          // Add delay between services
          if (services.indexOf(service) < services.length - 1) {
            await this.sleep(5000); // Longer delay for AI generation
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            message: `Failed to generate AI review for ${service.name}: ${errorMessage}`,
            serviceName: service.name,
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined,
          });
          context.logger?.(`✗ Failed to generate AI review for ${service.name}: ${errorMessage}`);
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
        message: `Generated ${recordsUpdated} AI reviews for ${recordsProcessed} services`,
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

  private async cleanup(): Promise<void> {
    await this.orchestrator.disconnect();
    await this.prisma.$disconnect();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

