/**
 * Security Utilities
 * Provides CORS, XSS protection, and input sanitization
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'https://localhost:3000',
];

/**
 * Check if origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow same-origin requests
  return ALLOWED_ORIGINS.includes(origin) || 
         ALLOWED_ORIGINS.some(allowed => origin.endsWith('.vercel.app'));
}

/**
 * Create CORS headers for a request
 */
export function createCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
  
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }
  
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request),
  });
}

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // HTML encode special characters
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : 
        typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return {
    valid: emailRegex.test(sanitized),
    sanitized,
  };
}

/**
 * Validate username
 */
export function validateUsername(username: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (username.length > 30) {
    errors.push('Username must be less than 30 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize MongoDB query to prevent injection
 */
export function sanitizeMongoQuery<T extends Record<string, unknown>>(query: T): T {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Remove MongoDB operators from user input
    if (key.startsWith('$')) {
      continue;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check for nested operators
      const hasOperator = Object.keys(value as object).some(k => k.startsWith('$'));
      if (hasOperator) {
        // Only allow specific safe operators
        const safeOperators = ['$in', '$nin', '$eq', '$ne', '$gt', '$gte', '$lt', '$lte'];
        const filtered: Record<string, unknown> = {};
        for (const [opKey, opValue] of Object.entries(value as Record<string, unknown>)) {
          if (safeOperators.includes(opKey)) {
            filtered[opKey] = opValue;
          }
        }
        sanitized[key] = filtered;
      } else {
        sanitized[key] = sanitizeMongoQuery(value as Record<string, unknown>);
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Security headers for all responses
 */
export const securityHeaders: HeadersInit = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(securityHeaders)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { maxSize = 100 * 1024 * 1024, allowedTypes } = options; // Default 100MB
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`);
  }
  
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
