/**
 * Trustpilot scraper for hosting reviews
 */

import { BaseScraper } from './base-scraper';
import { HostingReview, HostingPricing } from '../types';

export class TrustpilotScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.trustpilot.com';

  getSourceName(): string {
    return 'Trustpilot';
  }

  async scrapeReviews(serviceName: string, url?: string): Promise<HostingReview[]> {
    try {
      const searchUrl =
        url ||
        `${this.baseUrl}/review/${this.sanitizeServiceName(serviceName)}.com`;

      const html = await this.fetchHtml(searchUrl);
      const $ = this.parseHtml(html);

      const reviews: HostingReview[] = [];

      // Trustpilot review structure
      $('[data-service-review-card]').each((_, element) => {
        try {
          const $element = $(element);

          const author = this.cleanText($element.find('[data-consumer-name]').text());
          const ratingText = $element.find('[data-star-rating]').attr('data-star-rating') ||
            $element.find('.star-rating').attr('data-rating') ||
            $element.find('[class*="star"]').first().text();
          const rating = this.parseRating(ratingText);
          const content = this.cleanText($element.find('[data-service-review-text-typography]').text() ||
            $element.find('.review-text').text());
          const dateText = $element.find('[data-review-date-typography]').text() ||
            $element.find('time').attr('datetime') ||
            $element.find('time').text();
          const date = this.parseDate(dateText);
          const verified = $element.find('[data-verified-purchase]').length > 0 ||
            $element.find('.verified-purchase').length > 0;

          if (author && content && rating > 0) {
            reviews.push({
              author,
              rating,
              content,
              date,
              verified,
              source: this.getSourceName(),
              sourceUrl: searchUrl,
              serviceName,
            });
          }
        } catch (error) {
          // Skip malformed reviews
          console.warn('Error parsing Trustpilot review:', error);
        }
      });

      return reviews;
    } catch (error) {
      throw this.createScraperError(
        `Failed to scrape Trustpilot reviews: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  async scrapePricing(serviceName: string, url?: string): Promise<HostingPricing[]> {
    // Trustpilot doesn't typically have pricing information
    // This would need to be scraped from the actual service website
    return [];
  }

  private sanitizeServiceName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9-]/g, '');
  }
}

