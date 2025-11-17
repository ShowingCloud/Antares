import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  CJAdvertiser,
  CJAdvertiserDetails,
  CJLink,
  CJAdvertisersResponse,
  CJLinksResponse,
  CJApiError,
  AdvertiserCategory,
} from './types';

/**
 * Custom error class for CJ Affiliate API errors
 */
export class CJAffiliateError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'CJAffiliateError';
    Object.setPrototypeOf(this, CJAffiliateError.prototype);
  }
}

/**
 * Service class for interacting with CJ Affiliate API
 * 
 * @example
 * ```typescript
 * const service = new CJAffiliateService({
 *   personalAccessToken: process.env.CJ_PERSONAL_ACCESS_TOKEN!,
 *   companyId: process.env.CJ_COMPANY_ID!,
 *   propertyId: process.env.CJ_PROPERTY_ID!,
 * });
 * 
 * const advertisers = await service.getAdvertisersByCategory('hosting');
 * ```
 */
export class CJAffiliateService {
  private axiosInstance: AxiosInstance;
  private readonly baseURL = 'https://advertiser-lookup.api.cj.com/v3';
  private readonly companyId: string;
  private readonly propertyId: string;

  constructor(config: {
    personalAccessToken: string;
    companyId: string;
    propertyId: string;
    baseURL?: string;
  }) {
    this.companyId = config.companyId;
    this.propertyId = config.propertyId;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL || this.baseURL,
      headers: {
        Authorization: `Bearer ${config.personalAccessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handles axios errors and converts them to CJAffiliateError
   */
  private handleError(error: unknown): CJAffiliateError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<CJApiError>;
      const statusCode = axiosError.response?.status;
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'An unknown error occurred';

      return new CJAffiliateError(
        `CJ Affiliate API Error: ${errorMessage}`,
        statusCode,
        error
      );
    }

    if (error instanceof Error) {
      return new CJAffiliateError(
        `Unexpected error: ${error.message}`,
        undefined,
        error
      );
    }

    return new CJAffiliateError(
      'An unknown error occurred',
      undefined,
      error
    );
  }

  /**
   * Fetches advertisers by category
   * 
   * @param category - Category name (e.g., 'hosting', 'cloud')
   * @param options - Optional parameters for pagination and filtering
   * @returns Promise resolving to array of advertisers
   * @throws {CJAffiliateError} If the API request fails
   */
  async getAdvertisersByCategory(
    category: AdvertiserCategory,
    options?: {
      pageNumber?: number;
      recordsPerPage?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<CJAdvertiser[]> {
    try {
      const params: Record<string, string | number> = {
        'advertiser-ids': '',
        'records-per-page': options?.recordsPerPage || 100,
        'page-number': options?.pageNumber || 1,
        'advertiser-name': '',
        'advertiser-category': category,
        'relationship-status': 'joined',
        'requestor-cid': this.companyId,
      };

      if (options?.sortBy) {
        params['sort-by'] = options.sortBy;
        params['sort-order'] = options.sortOrder || 'asc';
      }

      const response = await this.axiosInstance.get<CJAdvertisersResponse>(
        '/advertisers',
        { params }
      );

      return response.data.advertisers || [];
    } catch (error) {
      if (error instanceof CJAffiliateError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Gets detailed information about a specific advertiser
   * 
   * @param advertiserId - The advertiser ID
   * @returns Promise resolving to advertiser details
   * @throws {CJAffiliateError} If the API request fails
   */
  async getAdvertiserDetails(
    advertiserId: string
  ): Promise<CJAdvertiserDetails> {
    try {
      if (!advertiserId || advertiserId.trim() === '') {
        throw new CJAffiliateError('Advertiser ID is required');
      }

      const response = await this.axiosInstance.get<CJAdvertiserDetails>(
        `/advertisers/${encodeURIComponent(advertiserId)}`,
        {
          params: {
            'requestor-cid': this.companyId,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (error instanceof CJAffiliateError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves link information for an advertiser
   * 
   * @param advertiserId - The advertiser ID
   * @param options - Optional parameters for filtering links
   * @returns Promise resolving to array of links
   * @throws {CJAffiliateError} If the API request fails
   */
  async getLinks(
    advertiserId: string,
    options?: {
      linkType?: string;
      promotionType?: string;
      pageNumber?: number;
      recordsPerPage?: number;
    }
  ): Promise<CJLink[]> {
    try {
      if (!advertiserId || advertiserId.trim() === '') {
        throw new CJAffiliateError('Advertiser ID is required');
      }

      const params: Record<string, string | number> = {
        'advertiser-ids': advertiserId,
        'website-id': this.propertyId,
        'requestor-cid': this.companyId,
        'records-per-page': options?.recordsPerPage || 100,
        'page-number': options?.pageNumber || 1,
      };

      if (options?.linkType) {
        params['link-type'] = options.linkType;
      }

      if (options?.promotionType) {
        params['promotion-type'] = options.promotionType;
      }

      const response = await this.axiosInstance.get<CJLinksResponse>('/links', {
        params,
      });

      return response.data.links || [];
    } catch (error) {
      if (error instanceof CJAffiliateError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Gets all advertisers for multiple categories
   * 
   * @param categories - Array of category names
   * @param options - Optional parameters for pagination
   * @returns Promise resolving to array of advertisers from all categories
   */
  async getAdvertisersByCategories(
    categories: AdvertiserCategory[],
    options?: {
      pageNumber?: number;
      recordsPerPage?: number;
    }
  ): Promise<CJAdvertiser[]> {
    try {
      const promises = categories.map((category) =>
        this.getAdvertisersByCategory(category, options)
      );

      const results = await Promise.allSettled(promises);

      const advertisers: CJAdvertiser[] = [];
      const errors: Error[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          advertisers.push(...result.value);
        } else {
          errors.push(
            new Error(
              `Failed to fetch advertisers for category "${categories[index]}": ${result.reason.message}`
            )
          );
        }
      });

      if (errors.length > 0 && advertisers.length === 0) {
        throw new CJAffiliateError(
          `All category requests failed: ${errors.map((e) => e.message).join('; ')}`
        );
      }

      // Remove duplicates based on advertiserId
      const uniqueAdvertisers = advertisers.filter(
        (advertiser, index, self) =>
          index === self.findIndex((a) => a.advertiserId === advertiser.advertiserId)
      );

      return uniqueAdvertisers;
    } catch (error) {
      if (error instanceof CJAffiliateError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }
}

