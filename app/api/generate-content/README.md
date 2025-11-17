# Content Generation API

API routes for triggering the content generation pipeline for hosting services.

## Endpoints

### POST `/api/generate-content`

Generate content for a single hosting service.

**Authentication:** Required (API Key)

**Request Headers:**
```
X-API-Key: your-api-key
# OR
Authorization: Bearer your-api-key
```

**Request Body:**
```json
{
  "serviceName": "Bluehost",
  "cjAdvertiserId": "123456", // Optional
  "categories": ["hosting", "cloud"], // Optional
  "generateAIReview": true, // Optional, default: true
  "scrapeReviews": true, // Optional, default: true
  "scrapePricing": true, // Optional, default: true
  "targetKeywords": ["bluehost review", "best hosting"], // Optional
  "customInstructions": "Focus on WordPress hosting", // Optional
  "skipExisting": false // Optional, default: false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hostingService": {
      "id": "uuid",
      "name": "Bluehost",
      "slug": "bluehost"
    },
    "reviewsCreated": 15,
    "metricsCreated": 8,
    "aiReviewGenerated": true,
    "sources": {
      "cjApi": true,
      "webScraping": true,
      "aiGeneration": true
    },
    "errors": []
  },
  "message": "Content generation completed successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing API key
- `400 Bad Request` - Invalid request body
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### GET `/api/generate-content?serviceName=Bluehost`

Get existing service data.

**Query Parameters:**
- `serviceName` (required) - Name of the hosting service
- `slug` (optional) - Slug of the hosting service

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Bluehost",
    "slug": "bluehost",
    "description": "...",
    "reviews": [...],
    "metrics": [...]
  }
}
```

### POST `/api/generate-content/batch`

Generate content for multiple hosting services (admin only).

**Authentication:** Required (Admin API Key)

**Request Headers:**
```
X-Admin-Key: your-admin-api-key
# OR
Authorization: Bearer your-admin-api-key
```

**Request Body:**
```json
{
  "services": [
    {
      "serviceName": "Bluehost",
      "generateAIReview": true,
      "scrapeReviews": true
    },
    {
      "serviceName": "HostGator",
      "generateAIReview": true,
      "scrapeReviews": true
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "totalReviewsCreated": 30,
    "totalMetricsCreated": 16,
    "aiReviewsGenerated": 2
  },
  "results": [...],
  "message": "Batch content generation completed: 2/2 successful"
}
```

## Rate Limiting

- **Standard API:** 10 requests per minute per IP/API key
- **Batch API:** 10 requests per minute per IP/Admin key
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After` (when rate limited)

## Environment Variables

Required:
- `API_KEY` - API key for authentication
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `ADMIN_API_KEY` - Admin API key for batch operations
- `CJ_PERSONAL_ACCESS_TOKEN` - CJ Affiliate API token
- `CJ_COMPANY_ID` - CJ Affiliate company ID
- `CJ_PROPERTY_ID` - CJ Affiliate property ID
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - OpenAI model (default: gpt-4-turbo-preview)
- `OPENAI_TEMPERATURE` - OpenAI temperature (default: 0.7)
- `OPENAI_MAX_TOKENS` - OpenAI max tokens (default: 4000)
- `SCRAPER_RATE_LIMIT_DELAY` - Scraper delay in ms (default: 2000)
- `SCRAPER_TIMEOUT` - Scraper timeout in ms (default: 30000)
- `SCRAPER_RETRIES` - Scraper retry count (default: 3)

## Example Usage

### cURL

```bash
# Generate content for a service
curl -X POST http://localhost:3000/api/generate-content \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "serviceName": "Bluehost",
    "generateAIReview": true,
    "scrapeReviews": true,
    "targetKeywords": ["bluehost review", "best hosting"]
  }'

# Get service data
curl -X GET "http://localhost:3000/api/generate-content?serviceName=Bluehost" \
  -H "X-API-Key: your-api-key"
```

### JavaScript/TypeScript

```typescript
// Generate content
const response = await fetch('/api/generate-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_KEY!,
  },
  body: JSON.stringify({
    serviceName: 'Bluehost',
    generateAIReview: true,
    scrapeReviews: true,
    targetKeywords: ['bluehost review', 'best hosting'],
  }),
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/generate-content',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key',
    },
    json={
        'serviceName': 'Bluehost',
        'generateAIReview': True,
        'scrapeReviews': True,
        'targetKeywords': ['bluehost review', 'best hosting'],
    }
)

print(response.json())
```

