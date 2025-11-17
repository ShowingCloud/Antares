# Admin Dashboard

Admin dashboard for managing hosting service reviews and content generation.

## Access

Navigate to `/admin` to access the dashboard.

## Features

- **Generate Reviews**: Form to create new hosting service reviews
- **Services List**: View all existing services with quick stats
- **Statistics**: Dashboard overview with key metrics
- **Client-side Form Handling**: Real-time form validation and submission

## Security Note

⚠️ **Important**: The admin dashboard currently uses `NEXT_PUBLIC_API_KEY` for authentication. This key will be exposed in the browser.

For production use, consider:
1. Implementing proper session-based authentication
2. Using Next.js Server Actions instead of client-side API calls
3. Adding role-based access control (RBAC)
4. Using environment-specific API keys

## Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_KEY=your-api-key-here
```

**Note**: For better security, consider implementing server-side authentication instead of exposing the API key to the client.

## Usage

1. Fill in the service name (required)
2. Optionally add CJ Advertiser ID, categories, keywords
3. Select which operations to perform (AI review, scraping, etc.)
4. Click "Generate Review"
5. View the generated service in the list or navigate to the service page

## API Endpoints Used

- `POST /api/generate-content` - Generate new review content
- `GET /api/admin/services` - Get all services
- `GET /api/admin/stats` - Get dashboard statistics

