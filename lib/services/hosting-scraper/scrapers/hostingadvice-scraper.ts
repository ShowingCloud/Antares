/**
 * HostingAdvice.com scraper for hosting reviews and pricing
 */

import { BaseScraper } from './base-scraper';
import { HostingReview, HostingPricing } from '../types';

export class HostingAdviceScraper extends BaseScraper {
  private readonly baseUrl = 'https://www.hostingadvice.com';

  getSourceName(): string {
    return 'HostingAdvice';
  }

  async scrapeReviews(serviceName: string, url?: string): Promise<HostingReview[]> {
    try {
      // Search for reviews on HostingAdvice
      const searchUrl =
        url ||
        `${this.baseUrl}/search/?q=${encodeURIComponent(serviceName)}`;

      const html = await this.fetchHtml(searchUrl);
      const $ = this.parseHtml(html);

      const reviews: HostingReview[] = [];

      // HostingAdvice review structure
      $('.review-item, .review, [class*="review"]').each((_, element) => {
        try {
          const $element = $(element);

          const author = this.cleanText($element.find('.author, .reviewer, [class*="author"]').text()) || 'Anonymous';
          const ratingText = $element.find('.rating, .stars, [class*="rating"]').text() ||
            $element.find('[data-rating]').attr('data-rating');
          const rating = this.parseRating(ratingText);
          const content = this.cleanText($element.find('.review-content, .review-text, [class*="content"]').text());
          const dateText = $element.find('.date, time, [class*="date"]').text() ||
            $element.find('time').attr('datetime');
          const date = this.parseDate(dateText);

          if (content && rating > 0) {
            reviews.push({
              author,
              rating,
              content,
              date,
              source: this.getSourceName(),
              sourceUrl: searchUrl,
              serviceName,
            });
          }
        } catch (error) {
          console.warn('Error parsing HostingAdvice review:', error);
        }
      });

      return reviews;
    } catch (error) {
      throw this.createScraperError(
        `Failed to scrape HostingAdvice reviews: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }

  async scrapePricing(serviceName: string, url?: string): Promise<HostingPricing[]> {
    try {
      const searchUrl =
        url ||
        `${this.baseUrl}/search/?q=${encodeURIComponent(serviceName + ' pricing')}`;

      const html = await this.fetchHtml(searchUrl);
      const $ = this.parseHtml(html);

      const pricing: HostingPricing[] = [];

      // Look for pricing tables or pricing information
      $('.pricing-table, .pricing-plan, [class*="pricing"]').each((_, element) => {
        try {
          const $element = $(element);

          const planName = this.cleanText($element.find('.plan-name, .plan-title, h3, h4').first().text()) || 'Standard Plan';
          const priceText = $element.find('.price, .amount, [class*="price"]').first().text();
          const { amount, currency } = this.parsePrice(priceText);

          // Extract features
          const features: string[] = [];
          $element.find('.feature, .plan-feature, li').each((_, featEl) => {
            const feature = this.cleanText($(featEl).text());
            if (feature) {
              features.push(feature);
            }
          });

          // Determine billing cycle
          const billingText = $element.text().toLowerCase();
          let billingCycle: 'monthly' | 'yearly' | 'one-time' = 'monthly';
          if (billingText.includes('year') || billingText.includes('annual')) {
            billingCycle = 'yearly';
          } else if (billingText.includes('one-time') || billingText.includes('lifetime')) {
            billingCycle = 'one-time';
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
              sourceUrl: searchUrl,
              lastUpdated: new Date(),
            });
          }
        } catch (error) {
          console.warn('Error parsing HostingAdvice pricing:', error);
        }
      });

      return pricing;
    } catch (error) {
      throw this.createScraperError(
        `Failed to scrape HostingAdvice pricing: ${error instanceof Error ? error.message : String(error)}`,
        url
      );
    }
  }
}

