/**
 * Example usage of Content Orchestrator Service
 * 
 * This file demonstrates how to use the orchestration service
 * to create complete hosting reviews by coordinating all services.
 */

import { ContentOrchestratorService } from './content-orchestrator.service';

// Example: Initialize the orchestrator with all services
async function exampleUsage() {
  const orchestrator = new ContentOrchestratorService({
    // CJ Affiliate API configuration
    cjApi: {
      personalAccessToken: process.env.CJ_PERSONAL_ACCESS_TOKEN!,
      companyId: process.env.CJ_COMPANY_ID!,
      propertyId: process.env.CJ_PROPERTY_ID!,
    },
    // OpenAI configuration
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 4000,
    },
    // Web scraper configuration
    scraper: {
      rateLimitDelay: 2000,
      timeout: 30000,
      retries: 3,
    },
    // Database configuration
    database: {
      enableAutoSave: true,
    },
  });

  try {
    // Example 1: Create a complete review with all services
    const result = await orchestrator.orchestrate({
      serviceName: 'Bluehost',
      categories: ['hosting', 'cloud'],
      generateAIReview: true,
      scrapeReviews: true,
      scrapePricing: true,
      targetKeywords: ['bluehost review', 'best web hosting', 'bluehost hosting'],
      customInstructions: 'Focus on WordPress hosting capabilities',
    });

    console.log('Orchestration Result:', {
      serviceId: result.hostingService.id,
      reviewsCreated: result.reviewsCreated,
      metricsCreated: result.metricsCreated,
      aiReviewGenerated: result.aiReviewGenerated,
      sources: result.sources,
      errors: result.errors,
    });

    // Example 2: Get complete service data
    const serviceData = await orchestrator.getServiceData('bluehost');
    console.log('Service Data:', serviceData);

    // Example 3: Batch orchestrate multiple services
    const batchResults = await orchestrator.batchOrchestrate([
      {
        serviceName: 'Bluehost',
        categories: ['hosting'],
        generateAIReview: true,
        scrapeReviews: true,
      },
      {
        serviceName: 'HostGator',
        categories: ['hosting'],
        generateAIReview: true,
        scrapeReviews: true,
      },
      {
        serviceName: 'SiteGround',
        categories: ['hosting', 'cloud'],
        generateAIReview: true,
        scrapeReviews: true,
      },
    ]);

    console.log('Batch Results:', batchResults);

    // Example 4: Use with existing CJ Advertiser ID
    const resultWithCJId = await orchestrator.orchestrate({
      serviceName: 'Bluehost',
      cjAdvertiserId: '123456',
      generateAIReview: true,
      scrapeReviews: true,
      skipExisting: false, // Update if exists
    });

    // Example 5: Only scrape data without AI generation
    const scrapeOnly = await orchestrator.orchestrate({
      serviceName: 'Bluehost',
      scrapeReviews: true,
      scrapePricing: true,
      generateAIReview: false,
    });

    // Cleanup
    await orchestrator.disconnect();
  } catch (error) {
    console.error('Orchestration error:', error);
  }
}

// Example: Minimal configuration (only web scraping)
async function minimalUsage() {
  const orchestrator = new ContentOrchestratorService({
    scraper: {
      rateLimitDelay: 2000,
    },
  });

  const result = await orchestrator.orchestrate({
    serviceName: 'Bluehost',
    scrapeReviews: true,
    scrapePricing: true,
    generateAIReview: false,
  });

  await orchestrator.disconnect();
  return result;
}

// Example: Only AI generation (no scraping, no CJ API)
async function aiOnlyUsage() {
  const orchestrator = new ContentOrchestratorService({
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  });

  const result = await orchestrator.orchestrate({
    serviceName: 'Bluehost',
    generateAIReview: true,
    scrapeReviews: false,
    scrapePricing: false,
    targetKeywords: ['bluehost review', 'best hosting'],
  });

  await orchestrator.disconnect();
  return result;
}

export { exampleUsage, minimalUsage, aiOnlyUsage };

