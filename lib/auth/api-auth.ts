/**
 * API Authentication utilities
 */

export interface AuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Verify API key authentication
 */
export function verifyApiKey(request: Request): AuthResult {
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return {
      authenticated: false,
      error: 'API key not configured on server',
    };
  }

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'API key required. Provide via X-API-Key header or Authorization Bearer token',
    };
  }

  if (apiKey !== validApiKey) {
    return {
      authenticated: false,
      error: 'Invalid API key',
    };
  }

  return {
    authenticated: true,
  };
}

/**
 * Verify admin authentication (for more sensitive operations)
 */
export function verifyAdminAuth(request: Request): AuthResult {
  const adminKey = request.headers.get('x-admin-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '');

  const validAdminKey = process.env.ADMIN_API_KEY;

  if (!validAdminKey) {
    return {
      authenticated: false,
      error: 'Admin API key not configured on server',
    };
  }

  if (!adminKey) {
    return {
      authenticated: false,
      error: 'Admin API key required',
    };
  }

  if (adminKey !== validAdminKey) {
    return {
      authenticated: false,
      error: 'Invalid admin API key',
    };
  }

  return {
    authenticated: true,
  };
}

/**
 * Get API key from request (for logging purposes, masked)
 */
export function getMaskedApiKey(request: Request): string {
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) return 'none';
  
  // Mask the key (show first 4 and last 4 characters)
  if (apiKey.length <= 8) return '****';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

