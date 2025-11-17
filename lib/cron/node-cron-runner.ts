/**
 * Node-cron runner for local/server environments
 * 
 * Use this for running cron jobs on a server (not Vercel)
 * 
 * Install: npm install node-cron @types/node-cron
 * Run with: npx tsx lib/cron/node-cron-runner.ts
 */

let cron: typeof import('node-cron');
try {
  cron = require('node-cron');
} catch (error) {
  console.error('node-cron is not installed. Install it with: npm install node-cron @types/node-cron');
  process.exit(1);
}
import { CronManager } from './cron-manager';

const cronManager = new CronManager((message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
});

/**
 * Start all enabled cron jobs
 */
export function startCronJobs(): void {
  const jobs = cronManager.getJobs();

  console.log('Starting cron job scheduler...');
  console.log(`Registered ${jobs.length} jobs`);

  jobs.forEach((jobConfig) => {
    if (!jobConfig.enabled) {
      console.log(`Skipping disabled job: ${jobConfig.name}`);
      return;
    }

    // Convert cron expression to node-cron format if needed
    const schedule = jobConfig.schedule;

    console.log(`Scheduling job: ${jobConfig.name} (${schedule})`);

    cron.schedule(schedule, async () => {
      try {
        console.log(`[${new Date().toISOString()}] Executing scheduled job: ${jobConfig.name}`);
        const result = await cronManager.executeJob(jobConfig.name);
        console.log(
          `[${new Date().toISOString()}] Job ${jobConfig.name} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Job ${jobConfig.name} failed:`,
          error
        );
      }
    });
  });

  console.log('Cron job scheduler started');
}

// Auto-start if run directly
if (require.main === module) {
  startCronJobs();
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down cron scheduler...');
    process.exit(0);
  });
  
  console.log('Cron scheduler running. Press Ctrl+C to stop.');
}

