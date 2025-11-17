/**
 * Base scraper class with common functionality
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { HostingReview, HostingPricing, ScraperConfig, ScraperError } from '../types';

export abstract class BaseScraper {
  protected axiosInstance: AxiosInstance;
  protected config: Required<ScraperConfig>;

  constructor(config: ScraperConfig = {}) {
    this.config = {
      rateLimitDelay: config.rateLimitDelay ?? 2000,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      userAgent:
        config.userAgent ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      headers: config.headers ?? {},
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...this.config.headers,
      },
    });
  }

  /**
   * Fetch HTML content from a URL with retries
   */
  protected async fetchHtml(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.axiosInstance.get(url);
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          // Don't retry on 4xx errors (except 429)
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500 && axiosError.response.status !== 429) {
            throw this.createScraperError(
              `HTTP ${axiosError.response.status}: ${axiosError.message}`,
              url,
              axiosError.response.status
            );
          }
        }

        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    throw this.createScraperError(
      `Failed to fetch after ${this.config.retries} attempts: ${lastError?.message}`,
      url
    );
  }

  /**
   * Parse HTML string to Cheerio object
   */
  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /**
   * Extract text content and clean it
   */
  protected cleanText(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ');
  }

  /**
   * Extract rating from various formats
   */
  protected parseRating(ratingText: string | null | undefined): number {
    if (!ratingText) return 0;

    // Extract number from text (e.g., "4.5", "4/5", "4 out of 5")
    const match = ratingText.match(/(\d+\.?\d*)/);
    if (match) {
      const value = parseFloat(match[1]);
      // Normalize to 1-5 scale if needed
      if (value > 5) {
        return value / (value > 10 ? 2 : 1);
      }
      return Math.min(5, Math.max(1, value));
    }

    return 0;
  }

  /**
   * Extract price from text
   */
  protected parsePrice(priceText: string | null | undefined): {
    amount: number;
    currency: string;
  } {
    if (!priceText) return { amount: 0, currency: 'USD' };

    // Extract currency symbol
    const currencyMatch = priceText.match(/[$€£¥]|USD|EUR|GBP|JPY/);
    const currency = currencyMatch
      ? currencyMatch[0] === '$'
        ? 'USD'
        : currencyMatch[0] === '€'
          ? 'EUR'
          : currencyMatch[0] === '£'
            ? 'GBP'
            : currencyMatch[0] === '¥'
              ? 'JPY'
              : currencyMatch[0]
      : 'USD';

    // Extract number
    const numberMatch = priceText.match(/(\d+\.?\d*)/);
    const amount = numberMatch ? parseFloat(numberMatch[1]) : 0;

    return { amount, currency };
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(dateText: string | null | undefined): Date {
    if (!dateText) return new Date();

    // Try parsing common date formats
    const date = new Date(dateText);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try relative dates (e.g., "2 days ago", "1 month ago")
    const relativeMatch = dateText.match(/(\d+)\s*(day|week|month|year)s?\s*ago/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const now = new Date();

      switch (unit) {
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
        case 'week':
          now.setDate(now.getDate() - amount * 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - amount);
          break;
      }

      return now;
    }

    return new Date();
  }

  /**
   * Create a scraper error object
   */
  protected createScraperError(
    message: string,
    url?: string,
    statusCode?: number
  ): ScraperError {
    return {
      message,
      source: this.getSourceName(),
      url,
      statusCode,
      timestamp: new Date(),
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Abstract methods to be implemented by specific scrapers
   */
  abstract getSourceName(): string;
  abstract scrapeReviews(serviceName: string, url?: string): Promise<HostingReview[]>;
  abstract scrapePricing(serviceName: string, url?: string): Promise<HostingPricing[]>;
}

