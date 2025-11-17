/**
 * Types for cron job system
 */

export interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression or Vercel cron format
  enabled: boolean;
  description?: string;
}

export interface CronJobResult {
  jobName: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  recordsProcessed?: number;
  recordsUpdated?: number;
  errors: CronJobError[];
  message?: string;
}

export interface CronJobError {
  message: string;
  serviceName?: string;
  timestamp: Date;
  stack?: string;
}

export interface UpdateJobOptions {
  serviceNames?: string[]; // If not provided, updates all services
  maxAge?: number; // Update services older than this (in hours)
  forceUpdate?: boolean; // Force update even if recently updated
  skipAIReview?: boolean; // Skip AI review generation
  skipScraping?: boolean; // Skip web scraping
}

export interface CronJobContext {
  jobName: string;
  startTime: Date;
  logger?: (message: string) => void;
}

