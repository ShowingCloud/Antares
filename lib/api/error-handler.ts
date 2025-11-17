/**
 * API Error handling utilities
 */

import { NextResponse } from 'next/server';
import { ContentOrchestrationError } from '../services/content-orchestrator';

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500
): NextResponse<ApiError> {
  const apiError: ApiError = {
    error: error instanceof Error ? error.message : 'An unknown error occurred',
    timestamp: new Date().toISOString(),
  };

  if (error instanceof ContentOrchestrationError) {
    apiError.code = error.source;
    apiError.details = {
      source: error.source,
    };
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    apiError.error = 'Internal server error';
    apiError.details = undefined;
  }

  return NextResponse.json(apiError, { status: statusCode });
}

/**
 * Handle authentication errors
 */
export function createAuthErrorResponse(message: string): NextResponse<ApiError> {
  return createErrorResponse(new Error(message), 401);
}

/**
 * Handle validation errors
 */
export function createValidationErrorResponse(
  message: string,
  details?: unknown
): NextResponse<ApiError> {
  const error: ApiError = {
    error: message,
    code: 'VALIDATION_ERROR',
    details,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(error, { status: 400 });
}

/**
 * Handle rate limiting errors
 */
export function createRateLimitErrorResponse(): NextResponse<ApiError> {
  const error: ApiError = {
    error: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(error, { status: 429 });
}

