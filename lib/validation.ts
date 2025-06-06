// lib/validation.ts - Updated addSecurityHeaders function
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { NextRequest, NextResponse } from 'next/server';
import { GenomicsValidation } from '@/lib/shared/genomics-validation';

// Basic string sanitization
function sanitizeString(val: string): string {
  return DOMPurify.sanitize(val.trim(), { ALLOWED_TAGS: [] });
}

// Custom Zod schemas - no transforms that break chaining
export const sanitizedString = z.string().transform(sanitizeString);

export const geneSymbol = z.string()
  .min(1, 'Gene symbol is required')
  .max(20, 'Gene symbol too long')
  .regex(/^[A-Z0-9-_.]+$/i, 'Invalid gene symbol format')
  .transform((val) => val.toUpperCase().trim());

export const chromosome = z.string()
  .refine((val) => {
    const result = GenomicsValidation.validateChromosome(val);
    return result.valid;
  }, 'Invalid chromosome')
  .transform((val) => GenomicsValidation.normalizeChromosome(val));

export const genomicPosition = z.coerce.number()
  .int('Position must be an integer')
  .min(1, 'Position must be positive')
  .max(300000000, 'Position exceeds maximum chromosome length');

export const nucleotide = z.string()
  .min(1, 'Nucleotide sequence required')
  .max(1000, 'Nucleotide sequence too long')
  .regex(/^[ATCGN-]+$/i, 'Invalid nucleotide sequence')
  .transform((val) => val.toUpperCase());

export const variantId = z.string()
  .min(1, 'Variant ID is required')
  .max(50, 'Variant ID too long')
  .regex(/^[A-Z0-9_.-]+$/i, 'Invalid variant ID format');

// Advanced validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Query too long')
    .transform(sanitizeString),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  types: z.array(z.enum(['genes', 'variants'])).optional(),
});

export const geneCreateSchema = z.object({
  gene_id: z.string()
    .min(1)
    .max(50)
    .transform(sanitizeString),
  symbol: geneSymbol,
  name: z.string()
    .min(1)
    .max(200)
    .transform(sanitizeString),
  chromosome: chromosome,
  start_position: genomicPosition.optional(),
  end_position: genomicPosition.optional(),
  strand: z.enum(['+', '-']).optional(),
  biotype: z.string()
    .max(50)
    .optional()
    .transform((val) => val ? sanitizeString(val) : val),
  description: z.string()
    .max(1000)
    .optional()
    .transform((val) => val ? sanitizeString(val) : val),
});

export const variantCreateSchema = z.object({
  variant_id: variantId,
  gene_symbol: geneSymbol,
  chromosome: chromosome,
  position: genomicPosition,
  reference_allele: nucleotide,
  alternate_allele: nucleotide,
  variant_type: z.enum(['SNV', 'INDEL', 'DEL', 'INS', 'COMPLEX']).optional(),
  consequence: z.string()
    .max(100)
    .optional()
    .transform((val) => val ? sanitizeString(val) : val),
  impact: z.enum(['HIGH', 'MODERATE', 'LOW', 'MODIFIER']).optional(),
  protein_change: z.string()
    .max(100)
    .optional()
    .transform((val) => val ? sanitizeString(val) : val),
  clinical_significance: z.enum([
    'Pathogenic',
    'Likely pathogenic',
    'Uncertain significance',
    'Likely benign',
    'Benign'
  ]).optional(),
  frequency: z.coerce.number().min(0).max(1).optional(),
});

// SQL injection prevention for raw queries
export function sanitizeForSql(input: string): string {
  return input
    .replace(/[';\\x00\\n\\r\\x1a"]/g, '') // Remove dangerous SQL characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// XSS prevention for user-generated content
export function sanitizeHtml(html: string, options: any = {}): string {
  const result = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    ...options,
  });
  
  // Convert TrustedHTML to string
  return typeof result === 'string' ? result : result.toString();
}

// File upload validation
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/json',
  'text/vcf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 100MB limit' };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type) && 
      !file.name.match(/\.(csv|json|vcf|xlsx?)$/i)) {
    return { valid: false, error: 'Invalid file type. Only CSV, JSON, VCF, and Excel files are allowed' };
  }
  
  // Check for potentially malicious filenames
  if (file.name.match(/[<>:"/\\|?*\x00-\x1f]/)) {
    return { valid: false, error: 'Invalid filename characters' };
  }
  
  return { valid: true };
}

// Request validation middleware
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' | 'params' = 'body'
): Promise<{ data?: T; error?: string; status?: number }> {
  try {
    let input: unknown;
    
    switch (source) {
      case 'body':
        try {
          input = await request.json();
        } catch {
          return { error: 'Invalid JSON in request body', status: 400 };
        }
        break;
      case 'query':
        input = Object.fromEntries(request.nextUrl.searchParams.entries());
        break;
      case 'params':
        // This would be handled differently in the route handler
        input = {};
        break;
    }
    
    const result = await schema.safeParseAsync(input);
    
    if (!result.success) {
      const errorMessages = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return { 
        error: `Validation failed: ${errorMessages}`, 
        status: 400 
      };
    }
    
    return { data: result.data };
  } catch (error) {
    console.error('Validation error:', error);
    return { 
      error: 'Internal validation error', 
      status: 500 
    };
  }
}

// Content Security Policy headers
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.genomics-platform.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Apply security headers to response - FIXED VERSION
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(CSP_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}