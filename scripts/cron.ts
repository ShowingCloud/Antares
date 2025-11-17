/**
 * Standalone cron job runner
 * 
 * Run with: npx tsx scripts/cron.ts <job-name>
 * 
 * For local development or server environments
 */

import { CronManager } from '../lib/cron/cron-manager';

const cronManager = new CronManager((message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
});

async function main() {
  const jobName = process.argv[2];

  if (!jobName) {
    console.error('Usage: npx tsx scripts/cron.ts <job-name>');
    console.error('\nAvailable jobs:');
    cronManager.getJobs().forEach((job) => {
      console.error(`  - ${job.name}: ${job.description || 'No description'}`);
    });
    process.exit(1);
  }

  try {
    console.log(`Executing job: ${jobName}`);
    const result = await cronManager.executeJob(jobName);

    console.log('\nJob Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Error executing job:', error);
    process.exit(1);
  }
}

main();

