/**
 * Content Orchestration Service
 * 
 * Coordinates CJ API, web scraping, and AI generation to create complete hosting reviews
 */

import { PrismaClient } from '@prisma/client';
import { CJAffiliateService } from '../cj-affiliate';
import { HostingScraperService } from '../hosting-scraper';
import { OpenAIReviewService } from '../openai-review';
import {
  OrchestrationConfig,
  OrchestrationResult,
  OrchestrationOptions,
  OrchestrationError,
  ServiceData,
} from './types';

export class ContentOrchestrationError extends Error {
  constructor(
    message: string,
    public source: OrchestrationError['source'],
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ContentOrchestrationError';
    Object.setPrototypeOf(this, ContentOrchestrationError.prototype);
  }
}

/**
 * Main orchestration service that coordinates all services
 */
export class ContentOrchestratorService {
  private prisma: PrismaClient;
  private cjService?: CJAffiliateService;
  private scraperService?: HostingScraperService;
  private aiService?: OpenAIReviewService;
  private config: OrchestrationConfig;

  constructor(config: OrchestrationConfig) {
    this.config = config;
    this.prisma = new PrismaClient();

    // Initialize CJ Affiliate service if configured
    if (config.cjApi) {
      this.cjService = new CJAffiliateService({
        personalAccessToken: config.cjApi.personalAccessToken,
        companyId: config.cjApi.companyId,
        propertyId: config.cjApi.propertyId,
      });
    }

    // Initialize web scraper service
    this.scraperService = new HostingScraperService(
      config.scraper || {}
    );

    // Initialize OpenAI service if configured
    if (config.openai) {
      this.aiService = new OpenAIReviewService({
        apiKey: config.openai.apiKey,
        model: config.openai.model,
        temperature: config.openai.temperature,
        maxTokens: config.openai.maxTokens,
      });
    }
  }

  /**
   * Main orchestration method - creates complete hosting review
   */
  async orchestrate(options: OrchestrationOptions): Promise<OrchestrationResult> {
    const errors: OrchestrationError[] = [];
    let serviceData: ServiceData | null = null;
    let hostingServiceId: string | null = null;
    let reviewsCreated = 0;
    let metricsCreated = 0;
    let aiReviewGenerated = false;

    try {
      // Step 1: Get or create hosting service
      const slug = this.createSlug(options.serviceName);
      
      if (options.skipExisting) {
        const existing = await this.prisma.hostingService.findUnique({
          where: { slug },
        });
        if (existing) {
          return {
            hostingService: {
              id: existing.id,
              name: existing.name,
              slug: existing.slug,
            },
            reviewsCreated: 0,
            metricsCreated: 0,
            aiReviewGenerated: false,
            sources: {
              cjApi: false,
              webScraping: false,
              aiGeneration: false,
            },
            errors: [
              {
                source: 'database',
                message: 'Service already exists, skipping',
                timestamp: new Date(),
                serviceName: options.serviceName,
              },
            ],
          };
        }
      }

      // Step 2: Fetch data from CJ API if configured
      if (this.cjService && (options.cjAdvertiserId || options.categories)) {
        try {
          serviceData = await this.fetchCJData(options);
        } catch (error) {
          errors.push({
            source: 'cj-api',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            serviceName: options.serviceName,
          });
        }
      }

      // Step 3: Create or update hosting service in database
      hostingServiceId = await this.createOrUpdateService(
        options,
        serviceData
      );

      // Step 4: Scrape reviews and pricing from web
      if (options.scrapeReviews || options.scrapePricing) {
        try {
          const scrapingResults = await this.scrapeData(
            options.serviceName,
            hostingServiceId,
            {
              scrapeReviews: options.scrapeReviews ?? true,
              scrapePricing: options.scrapePricing ?? true,
            }
          );
          reviewsCreated = scrapingResults.reviewsCreated;
          metricsCreated = scrapingResults.metricsCreated;
        } catch (error) {
          errors.push({
            source: 'web-scraping',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            serviceName: options.serviceName,
          });
        }
      }

      // Step 5: Generate AI review if configured
      if (this.aiService && options.generateAIReview) {
        try {
          await this.generateAndStoreAIReview(
            options,
            hostingServiceId,
            serviceData
          );
          aiReviewGenerated = true;
        } catch (error) {
          errors.push({
            source: 'ai-generation',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
            serviceName: options.serviceName,
          });
        }
      }

      // Get the created service
      const hostingService = await this.prisma.hostingService.findUnique({
        where: { id: hostingServiceId },
      });

      if (!hostingService) {
        throw new ContentOrchestrationError(
          'Failed to retrieve created hosting service',
          'database'
        );
      }

      return {
        hostingService: {
          id: hostingService.id,
          name: hostingService.name,
          slug: hostingService.slug,
        },
        reviewsCreated,
        metricsCreated,
        aiReviewGenerated,
        sources: {
          cjApi: !!serviceData,
          webScraping: reviewsCreated > 0 || metricsCreated > 0,
          aiGeneration: aiReviewGenerated,
        },
        errors,
      };
    } catch (error) {
      throw new ContentOrchestrationError(
        `Orchestration failed: ${error instanceof Error ? error.message : String(error)}`,
        'database',
        error
      );
    }
  }

  /**
   * Fetch data from CJ Affiliate API
   */
  private async fetchCJData(
    options: OrchestrationOptions
  ): Promise<ServiceData> {
    if (!this.cjService) {
      throw new ContentOrchestrationError(
        'CJ Affiliate service not configured',
        'cj-api'
      );
    }

    let advertiserDetails;
    let links;

    // Get advertiser details
    if (options.cjAdvertiserId) {
      advertiserDetails = await this.cjService.getAdvertiserDetails(
        options.cjAdvertiserId
      );
    } else if (options.categories && options.categories.length > 0) {
      // Search by category
      const advertisers = await this.cjService.getAdvertisersByCategories(
        options.categories
      );
      const matching = advertisers.find(
        (a) =>
          a.advertiserName.toLowerCase() ===
          options.serviceName.toLowerCase()
      );
      if (matching) {
        advertiserDetails = await this.cjService.getAdvertiserDetails(
          matching.advertiserId
        );
      }
    }

    if (!advertiserDetails) {
      throw new ContentOrchestrationError(
        `Advertiser not found for ${options.serviceName}`,
        'cj-api'
      );
    }

    // Get affiliate links
    try {
      links = await this.cjService.getLinks(advertiserDetails.advertiserId);
    } catch (error) {
      console.warn('Failed to fetch links:', error);
    }

    const affiliateLink =
      links && links.length > 0 ? links[0].clickUrl : undefined;

    return {
      name: advertiserDetails.advertiserName,
      slug: this.createSlug(advertiserDetails.advertiserName),
      description: advertiserDetails.description,
      features: advertiserDetails.linkTypes?.map((lt) => lt.linkType) || [],
      pricing: undefined, // CJ API doesn't provide pricing
      cjAdvertiserId: advertiserDetails.advertiserId,
      affiliateLink,
    };
  }

  /**
   * Create or update hosting service in database
   */
  private async createOrUpdateService(
    options: OrchestrationOptions,
    cjData: ServiceData | null
  ): Promise<string> {
    const slug = cjData?.slug || this.createSlug(options.serviceName);
    const name = cjData?.name || options.serviceName;

    const service = await this.prisma.hostingService.upsert({
      where: { slug },
      update: {
        name,
        description: cjData?.description || undefined,
        features: cjData?.features ? (cjData.features as any) : undefined,
        pricing: cjData?.pricing || undefined,
        affiliateLink: cjData?.affiliateLink || undefined,
        cjAdvertiserId: cjData?.cjAdvertiserId || undefined,
        lastUpdated: new Date(),
      },
      create: {
        name,
        slug,
        description: cjData?.description || undefined,
        features: cjData?.features ? (cjData.features as any) : undefined,
        pricing: cjData?.pricing || undefined,
        affiliateLink: cjData?.affiliateLink || undefined,
        cjAdvertiserId: cjData?.cjAdvertiserId || undefined,
      },
    });

    return service.id;
  }

  /**
   * Scrape reviews and pricing data
   */
  private async scrapeData(
    serviceName: string,
    serviceId: string,
    options: { scrapeReviews: boolean; scrapePricing: boolean }
  ): Promise<{ reviewsCreated: number; metricsCreated: number }> {
    if (!this.scraperService) {
      throw new ContentOrchestrationError(
        'Scraper service not initialized',
        'web-scraping'
      );
    }

    let reviewsCreated = 0;
    let metricsCreated = 0;

    // Scrape reviews
    if (options.scrapeReviews) {
      try {
        const reviews = await this.scraperService.scrapeReviews(serviceName);
        
        // Store reviews in database
        for (const review of reviews) {
          await this.prisma.review.create({
            data: {
              serviceId,
              content: review.content,
              rating: review.rating,
              author: review.author || null,
              createdAt: review.date instanceof Date ? review.date : new Date(review.date),
            },
          });
          reviewsCreated++;
        }
      } catch (error) {
        console.warn('Failed to scrape reviews:', error);
      }
    }

    // Scrape pricing
    if (options.scrapePricing) {
      try {
        const pricing = await this.scraperService.scrapePricing(serviceName);
        
        // Store pricing as comparison metrics
        for (const plan of pricing) {
          await this.prisma.comparisonMetric.create({
            data: {
              serviceId,
              metricName: `Pricing: ${plan.planName}`,
              value: `${plan.currency} ${plan.price}/${plan.billingCycle}`,
              source: plan.source,
            },
          });
          metricsCreated++;

          // Also store features as metrics
          for (const feature of plan.features) {
            await this.prisma.comparisonMetric.create({
              data: {
                serviceId,
                metricName: 'Feature',
                value: feature,
                source: plan.source,
              },
            });
            metricsCreated++;
          }
        }
      } catch (error) {
        console.warn('Failed to scrape pricing:', error);
      }
    }

    return { reviewsCreated, metricsCreated };
  }

  /**
   * Generate and store AI review
   */
  private async generateAndStoreAIReview(
    options: OrchestrationOptions,
    serviceId: string,
    cjData: ServiceData | null
  ): Promise<void> {
    if (!this.aiService) {
      throw new ContentOrchestrationError(
        'OpenAI service not configured',
        'ai-generation'
      );
    }

    // Get existing service data for context
    const service = await this.prisma.hostingService.findUnique({
      where: { id: serviceId },
      include: { reviews: true, metrics: true },
    });

    if (!service) {
      throw new ContentOrchestrationError(
        'Service not found',
        'database'
      );
    }

    // Prepare features array
    const features: string[] = [];
    if (service.features) {
      if (Array.isArray(service.features)) {
        features.push(...(service.features as string[]));
      }
    }
    if (cjData?.features) {
      features.push(...cjData.features);
    }

    // Generate AI review
    const aiReview = await this.aiService.generateReview({
      serviceName: service.name,
      serviceDescription: service.description || cjData?.description,
      features: features.length > 0 ? features : undefined,
      pricing: service.pricing || cjData?.pricing,
      targetKeywords: options.targetKeywords,
      customInstructions: options.customInstructions,
      tone: 'professional',
      length: 'medium',
    });

    // Store AI-generated review in database
    await this.prisma.review.create({
      data: {
        serviceId,
        content: `${aiReview.title}\n\n${aiReview.content}\n\nPros:\n${aiReview.pros.map((p) => `- ${p}`).join('\n')}\n\nCons:\n${aiReview.cons.map((c) => `- ${c}`).join('\n')}`,
        rating: aiReview.rating,
        author: 'AI Generated Review',
        createdAt: new Date(),
      },
    });

    // Store SEO metadata as metrics
    if (aiReview.metadata.keywords) {
      for (const keyword of aiReview.metadata.keywords) {
        await this.prisma.comparisonMetric.create({
          data: {
            serviceId,
            metricName: 'SEO Keyword',
            value: keyword,
            source: 'AI Generation',
          },
        });
      }
    }

    // Update service description if not set
    if (!service.description && aiReview.metadata.metaDescription) {
      await this.prisma.hostingService.update({
        where: { id: serviceId },
        data: {
          description: aiReview.metadata.metaDescription,
        },
      });
    }
  }

  /**
   * Create URL-friendly slug from service name
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Batch orchestrate multiple services
   */
  async batchOrchestrate(
    options: OrchestrationOptions[]
  ): Promise<OrchestrationResult[]> {
    const results: OrchestrationResult[] = [];

    for (const option of options) {
      try {
        const result = await this.orchestrate(option);
        results.push(result);
        
        // Add delay between services to respect rate limits
        if (options.indexOf(option) < options.length - 1) {
          await this.sleep(3000); // 3 second delay
        }
      } catch (error) {
        results.push({
          hostingService: {
            id: '',
            name: option.serviceName,
            slug: this.createSlug(option.serviceName),
          },
          reviewsCreated: 0,
          metricsCreated: 0,
          aiReviewGenerated: false,
          sources: {
            cjApi: false,
            webScraping: false,
            aiGeneration: false,
          },
          errors: [
            {
              source: 'database',
              message: error instanceof Error ? error.message : String(error),
              timestamp: new Date(),
              serviceName: option.serviceName,
            },
          ],
        });
      }
    }

    return results;
  }

  /**
   * Get complete service data with all relations
   */
  async getServiceData(slug: string) {
    return await this.prisma.hostingService.findUnique({
      where: { slug },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
        metrics: true,
      },
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup - close Prisma connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

