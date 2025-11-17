/**
 * TypeScript types for CJ Affiliate API responses
 */

export interface CJAdvertiser {
  advertiserId: string;
  accountStatus: string;
  sevenDayEpc: string;
  threeMonthEpc: string;
  language: string;
  advertiserName: string;
  programUrl: string;
  relationshipStatus: string;
  networkRank: string;
  primaryCategory: {
    categoryId: string;
    categoryName: string;
  };
  performanceIncentives: string;
  actions: {
    actionType: string;
    actionTrackerId: string;
    actionTrackerName: string;
  }[];
  linkTypes: {
    linkType: string;
    linkTypeId: string;
  }[];
  promotionTypes: {
    promotionType: string;
    promotionTypeId: string;
  }[];
  cookieDays: number;
  description: string;
  promotionStartDate: string;
  promotionEndDate: string;
  categoryIds: string[];
}

export interface CJAdvertiserDetails extends CJAdvertiser {
  commissionRates: {
    commissionId: string;
    commissionName: string;
    default: boolean;
    priority: number;
    tiered: boolean;
  }[];
  promotionTypes: {
    promotionType: string;
    promotionTypeId: string;
    promotionStartDate: string;
    promotionEndDate: string;
  }[];
  productFeeds: {
    feedId: string;
    feedName: string;
    feedUrl: string;
  }[];
}

export interface CJLink {
  advertiserId: string;
  advertiserName: string;
  categoryId: string;
  categoryName: string;
  clickCommission: string;
  creativeHeight: string;
  creativeWidth: string;
  description: string;
  destination: string;
  language: string;
  linkCode: {
    linkCodeHtml: string;
    linkCodeJavascript: string;
  };
  linkId: string;
  linkName: string;
  linkType: string;
  linkTypeId: string;
  advertiserSupplied: boolean;
  promotionStartDate: string;
  promotionEndDate: string;
  promotionType: string;
  relationshipStatus: string;
  size: string;
  clickUrl: string;
}

export interface CJAdvertisersResponse {
  advertisers: CJAdvertiser[];
  totalMatched: number;
  recordsReturned: number;
  pageNumber: number;
}

export interface CJLinksResponse {
  links: CJLink[];
  totalMatched: number;
  recordsReturned: number;
  pageNumber: number;
}

export interface CJApiError {
  error: string;
  message: string;
  statusCode?: number;
}

export type AdvertiserCategory = 'hosting' | 'cloud' | string;

