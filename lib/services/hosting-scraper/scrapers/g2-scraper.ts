/**
 * G2 scraper for hosting reviews and pricing
 */

import { BaseScraper } from './base-scraper';
import { HostingReview, HostingPricing } from '../types';

export class G2Scraper extends BaseScraper {
  private readonly baseUrl = 'https://www.g2.com';

  getSourceName(): string {
    return 'G2';
  }

  async scrapeReviews(serviceName: string, url?: string): Promise<HostingReview[]> {
    try {
      const searchUrl =
        url ||
        `${this.baseUrl}/products/${this.sanitizeServiceName(serviceName)}/reviews`;

      const html = await this.fetchHtml(searchUrl);
      const $ = this.parseHtml(html);

      const reviews: HostingReview[] = [];

      // G2 review structure
      $('.review-item, [data-testid="review"], .review').each((_, element) => {
        try {
          const $element = $(element);

          const author = this.cleanText($element.find('.reviewer-name, .author-name, [class*="reviewer"]').text()) || 'Anonymous';
          const ratingText = $element.find('.star-rating, [data-rating], .rating').attr('data-rating') ||
            $element.find('.star-rating, .rating').text();
          const rating = this.parseRating(ratingText);
          const content = this.cleanText($element.find('.review-text, .review-content, [class*="review-text"]').text());
          const dateText = $element.find('.review-date, time, [class*="date"]').text() ||
            $element.find('time').attr('datetime');
          const date = this.parseDate(dateText);
          const verified = $element.find('.verified-badge, [class*="verified"]').length > 0;

          if (content && rating > 0) {
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
          console.warn('Error parsing G2 review:', error);
        }
      });

      return reviews;
    } catch (error) {
      throw this.createScraperError(
        `Failed to scrape G2 reviews: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  async scrapePricing(serviceName: string, url?: string): Promise<HostingPricing[]> {
    try {
      const productUrl =
        url ||
        `${this.baseUrl}/products/${this.sanitizeServiceName(serviceName)}`;

      const html = await this.fetchHtml(productUrl);
      const $ = this.parseHtml(html);

      const pricing: HostingPricing[] = [];

      // G2 pricing structure
      $('.pricing-tier, .pricing-plan, [class*="pricing"]').each((_, element) => {
        try {
          const $element = $(element);

          const planName = this.cleanText($element.find('.plan-name, .tier-name, h3').first().text()) || 'Standard Plan';
          const priceText = $element.find('.price, .amount, [class*="price"]').first().text();
          const { amount, currency } = this.parsePrice(priceText);

          const features: string[] = [];
          $element.find('.feature, li').each((_, featEl) => {
            const feature = this.cleanText($(featEl).text());
            if (feature) {
              features.push(feature);
            }
          });

          const billingText = $element.text().toLowerCase();
          let billingCycle: 'monthly' | 'yearly' | 'one-time' = 'monthly';
          if (billingText.includes('year') || billingText.includes('annual')) {
            billingCycle = 'yearly';
          }

          if (amount > 0) {
            pricing.push({
              planName,
              price: amount,
              currency,
              billingCycle,
              features,
              serviceName,
              source: this.getSourceName(),
              sourceUrl: productUrl,
              lastUpdated: new Date(),
            });
          }
        } catch (error) {
          console.warn('Error parsing G2 pricing:', error);
        }
      });

      return pricing;
    } catch (error) {
      throw this.createScraperError(
        `Failed to scrape G2 pricing: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  private sanitizeServiceName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}

