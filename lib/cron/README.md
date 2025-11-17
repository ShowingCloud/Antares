# Cron Job System

Automated scheduling system for updating hosting service data, scraping reviews, and generating AI content.

## Overview

The cron job system provides three main scheduled tasks:

1. **update-services** - Updates all hosting services with fresh data (every 6 hours)
2. **scrape-reviews** - Scrapes new reviews from web sources (every 12 hours)
3. **generate-ai-reviews** - Generates AI reviews for services without them (daily at 2 AM)

## Deployment Options

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Vercel automatically runs cron jobs based on `vercel.json` configuration.

**Configuration:** `vercel.json` is already set up with cron schedules.

**No additional setup required** - Vercel handles execution automatically.

### Option 2: API Routes (For external cron services)

Use external cron services (like cron-job.org, EasyCron, etc.) to call the API endpoints.

**Endpoint:** `GET /api/cron?job=<job-name>`

**Authentication:** Requires API key via `X-API-Key` header.

**Example:**
```bash
curl -X GET "https://your-domain.com/api/cron?job=update-services" \
  -H "X-API-Key: your-api-key"
```

### Option 3: Node-cron (For server deployments)

For running on a dedicated server or VPS.

**Install dependencies:**
```bash
npm install node-cron
npm install -D @types/node-cron
```

**Run the scheduler:**
```bash
npx tsx lib/cron/node-cron-runner.ts
```

Or add to your server startup:
```typescript
import { startCronJobs } from '@/lib/cron/node-cron-runner';
startCronJobs();
```

### Option 4: Manual Execution

Run jobs manually via script:

```bash
npx tsx scripts/cron.ts update-services
npx tsx scripts/cron.ts scrape-reviews
npx tsx scripts/cron.ts generate-ai-reviews
```

## Available Jobs

### update-services

Updates existing hosting services with fresh data from:
- CJ Affiliate API (advertiser details, affiliate links)
- Web scraping (reviews, pricing)
- AI generation (SEO-optimized reviews)

**Schedule:** Every 6 hours (`0 */6 * * *`)

**Options:**
- `maxAge` - Only update services older than X hours
- `forceUpdate` - Force update even if recently updated
- `skipAIReview` - Skip AI review generation
- `skipScraping` - Skip web scraping

**Example:**
```bash
# Update services older than 24 hours
GET /api/cron?job=update-services&maxAge=24

# Force update all services
GET /api/cron?job=update-services&forceUpdate=true
```

### scrape-reviews

Scrapes new reviews from web sources (Trustpilot, G2, HostingAdvice) for existing services.

**Schedule:** Every 12 hours (`0 */12 * * *`)

**Features:**
- Automatically detects and skips duplicate reviews
- Updates service `lastUpdated` timestamp
- Processes up to 20 services per run

### generate-ai-reviews

Generates AI-powered SEO reviews for services that don't have them yet.

**Schedule:** Daily at 2 AM (`0 2 * * *`)

**Features:**
- Only processes services without AI reviews
- Limits to 10 services per run
- Includes longer delays to respect API rate limits

## API Endpoints

### GET /api/cron

Execute a cron job via API.

**Query Parameters:**
- `job` (required) - Job name to execute
- `maxAge` (optional) - For update-services job
- `forceUpdate` (optional) - For update-services job
- `skipAIReview` (optional) - For update-services job
- `skipScraping` (optional) - For update-services job

**Response:**
```json
{
  "success": true,
  "job": "update-services",
  "result": {
    "jobName": "update-services",
    "success": true,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:05:00.000Z",
    "duration": 300000,
    "recordsProcessed": 10,
    "recordsUpdated": 8,
    "errors": [],
    "message": "Updated 8/10 services"
  }
}
```

### POST /api/cron

Execute a cron job with options in request body.

**Request Body:**
```json
{
  "job": "update-services",
  "options": {
    "maxAge": 24,
    "forceUpdate": false
  }
}
```

## Job Configuration

Jobs are configured in `lib/cron/cron-manager.ts`. You can:

- **Register new jobs:**
```typescript
cronManager.registerJob({
  name: 'custom-job',
  schedule: '0 0 * * *', // Daily at midnight
  enabled: true,
  description: 'Custom job description',
});
```

- **Enable/disable jobs:**
```typescript
cronManager.setJobEnabled('update-services', false);
```

- **Get job list:**
```typescript
const jobs = cronManager.getJobs();
```

## Monitoring

All jobs log their execution to the console with timestamps. For production, consider:

1. **Logging to a service** (e.g., Logtail, Datadog)
2. **Error tracking** (e.g., Sentry)
3. **Metrics collection** (e.g., Prometheus)

## Error Handling

Jobs are designed to be resilient:
- Individual service failures don't stop the entire job
- Errors are collected and reported in the result
- Jobs continue processing even if some operations fail

## Rate Limiting

Jobs include built-in rate limiting:
- Delays between service updates (3 seconds)
- Longer delays for AI generation (5 seconds)
- Respects external API rate limits

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `API_KEY` - For API route authentication

Optional:
- `CJ_PERSONAL_ACCESS_TOKEN` - For CJ API integration
- `CJ_COMPANY_ID` - For CJ API integration
- `CJ_PROPERTY_ID` - For CJ API integration
- `OPENAI_API_KEY` - For AI review generation
- `OPENAI_MODEL` - OpenAI model to use (default: gpt-4-turbo-preview)

## Troubleshooting

### Jobs not running on Vercel

1. Check `vercel.json` is in the project root
2. Verify cron schedules are valid
3. Check Vercel dashboard for cron job status
4. Review function logs in Vercel dashboard

### Jobs failing

1. Check environment variables are set
2. Review job execution logs
3. Verify database connection
4. Check API rate limits

### High API costs

1. Reduce job frequency in `vercel.json`
2. Use `skipAIReview` option for update-services
3. Limit number of services processed per run
4. Adjust `maxAge` to update less frequently

