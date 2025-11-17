/**
 * Client-side API helper for admin dashboard
 */

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function generateContent(data: {
  serviceName: string;
  cjAdvertiserId?: string;
  categories?: string[];
  generateAIReview?: boolean;
  scrapeReviews?: boolean;
  scrapePricing?: boolean;
  targetKeywords?: string[];
  customInstructions?: string;
  skipExisting?: boolean;
}) {
  const response = await fetch('/api/generate-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate content');
  }

  return response.json();
}

export async function getServices() {
  const response = await fetch('/api/admin/services', {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch services');
  }

  return response.json();
}

export async function getStats() {
  const response = await fetch('/api/admin/stats', {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}

