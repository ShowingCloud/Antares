/**
 * Cron job: Update hosting services
 * 
 * Updates existing hosting services with fresh data from CJ API, web scraping, and AI
 */

import { PrismaClient } from '@prisma/client';
import { ContentOrchestratorService } from '@/lib/services/content-orchestrator';
import { CronJobContext, CronJobResult, CronJobError, UpdateJobOptions } from '../types';

export class UpdateServicesJob {
  private prisma: PrismaClient;
  private orchestrator: ContentOrchestratorService;

  constructor() {
    this.prisma = new PrismaClient();
    this.orchestrator = new ContentOrchestratorService({
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
          }
        : undefined,
      scraper: {
        rateLimitDelay: 2000,
      },
    });
  }

  async execute(context: CronJobContext, options: UpdateJobOptions = {}): Promise<CronJobResult> {
    const errors: CronJobError[] = [];
    let recordsProcessed = 0;
    let recordsUpdated = 0;

    try {
      context.logger?.(`Starting ${context.jobName}...`);

      // Get services to update
      const services = await this.getServicesToUpdate(options);
      context.logger?.(`Found ${services.length} services to update`);

      recordsProcessed = services.length;

      // Update each service
      for (const service of services) {
        try {
          context.logger?.(`Updating service: ${service.name}`);

          const result = await this.orchestrator.orchestrate({
            serviceName: service.name,
            cjAdvertiserId: service.cjAdvertiserId || undefined,
            generateAIReview: !options.skipAIReview,
            scrapeReviews: !options.skipScraping,
            scrapePricing: !options.skipScraping,
            skipExisting: false, // Always update existing
          });

          if (result.errors.length === 0) {
            recordsUpdated++;
            context.logger?.(`✓ Successfully updated ${service.name}`);
          } else {
            errors.push({
              message: `Errors updating ${service.name}: ${result.errors.map((e) => e.message).join('; ')}`,
              serviceName: service.name,
              timestamp: new Date(),
            });
            context.logger?.(`⚠ Updated ${service.name} with errors`);
          }

          // Add delay between services to respect rate limits
          if (services.indexOf(service) < services.length - 1) {
            await this.sleep(3000);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            message: `Failed to update ${service.name}: ${errorMessage}`,
            serviceName: service.name,
            timestamp: new Date(),
            stack: error instanceof Error ? error.stack : undefined,
          });
          context.logger?.(`✗ Failed to update ${service.name}: ${errorMessage}`);
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
        message: `Updated ${recordsUpdated}/${recordsProcessed} services`,
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

  private async getServicesToUpdate(options: UpdateJobOptions) {
    const where: any = {};

    // Filter by service names if provided
    if (options.serviceNames && options.serviceNames.length > 0) {
      where.name = {
        in: options.serviceNames,
      };
    }

    // Filter by last updated time if maxAge is provided
    if (options.maxAge && !options.forceUpdate) {
      const maxAgeDate = new Date();
      maxAgeDate.setHours(maxAgeDate.getHours() - options.maxAge);
      where.lastUpdated = {
        lt: maxAgeDate,
      };
    }

    return await this.prisma.hostingService.findMany({
      where,
      orderBy: {
        lastUpdated: 'asc', // Update oldest first
      },
      take: options.serviceNames ? undefined : 50, // Limit to 50 if not specific
    });
  }

  private async cleanup(): Promise<void> {
    await this.orchestrator.disconnect();
    await this.prisma.$disconnect();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

