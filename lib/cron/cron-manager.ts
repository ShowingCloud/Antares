/**
 * Cron Job Manager
 * 
 * Manages and executes scheduled cron jobs
 */

import { CronJobConfig, CronJobResult, CronJobContext } from './types';
import { UpdateServicesJob } from './jobs/update-services.job';
import { ScrapeReviewsJob } from './jobs/scrape-reviews.job';
import { GenerateAIReviewsJob } from './jobs/generate-ai-reviews.job';

export class CronManager {
  private jobs: Map<string, CronJobConfig> = new Map();
  private logger?: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger;
    this.initializeDefaultJobs();
  }

  /**
   * Initialize default cron jobs
   */
  private initializeDefaultJobs(): void {
    this.registerJob({
      name: 'update-services',
      schedule: '0 */6 * * *', // Every 6 hours
      enabled: true,
      description: 'Update all hosting services with fresh data',
    });

    this.registerJob({
      name: 'scrape-reviews',
      schedule: '0 */12 * * *', // Every 12 hours
      enabled: true,
      description: 'Scrape new reviews from web sources',
    });

    this.registerJob({
      name: 'generate-ai-reviews',
      schedule: '0 2 * * *', // Daily at 2 AM
      enabled: true,
      description: 'Generate AI reviews for services without them',
    });
  }

  /**
   * Register a cron job
   */
  registerJob(config: CronJobConfig): void {
    this.jobs.set(config.name, config);
    this.logger?.(`Registered cron job: ${config.name} (${config.schedule})`);
  }

  /**
   * Execute a specific job by name
   */
  async executeJob(jobName: string, options?: any): Promise<CronJobResult> {
    const config = this.jobs.get(jobName);
    if (!config) {
      throw new Error(`Job ${jobName} not found`);
    }

    if (!config.enabled) {
      return {
        jobName,
        success: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        errors: [
          {
            message: `Job ${jobName} is disabled`,
            timestamp: new Date(),
          },
        ],
        message: 'Job is disabled',
      };
    }

    const context: CronJobContext = {
      jobName,
      startTime: new Date(),
      logger: this.logger,
    };

    this.logger?.(`Executing job: ${jobName}`);

    try {
      let result: CronJobResult;

      switch (jobName) {
        case 'update-services':
          const updateJob = new UpdateServicesJob();
          result = await updateJob.execute(context, options);
          break;

        case 'scrape-reviews':
          const scrapeJob = new ScrapeReviewsJob();
          result = await scrapeJob.execute(context);
          break;

        case 'generate-ai-reviews':
          const aiJob = new GenerateAIReviewsJob();
          result = await aiJob.execute(context);
          break;

        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      this.logger?.(
        `Job ${jobName} completed: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration}ms)`
      );

      return result;
    } catch (error) {
      this.logger?.(`Job ${jobName} failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get all registered jobs
   */
  getJobs(): CronJobConfig[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job config
   */
  getJob(jobName: string): CronJobConfig | undefined {
    return this.jobs.get(jobName);
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobName: string, enabled: boolean): void {
    const config = this.jobs.get(jobName);
    if (config) {
      config.enabled = enabled;
      this.logger?.(`Job ${jobName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

