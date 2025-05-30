// lib/utils/serialization.ts
/**
 * Serialization utilities for handling BigInt and other complex types
 */

// Deep transform function to handle BigInt and other types
export function serializeForJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeForJSON);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeForJSON(value);
    }
    return serialized;
  }

  return obj;
}

// Specific serializers for database models
export function serializeGene(gene: any) {
  return serializeForJSON({
    ...gene,
    startPosition: gene.startPosition ? gene.startPosition.toString() : null,
    endPosition: gene.endPosition ? gene.endPosition.toString() : null,
    createdAt: gene.createdAt?.toISOString(),
    updatedAt: gene.updatedAt?.toISOString(),
  });
}

export function serializeVariant(variant: any) {
  return serializeForJSON({
    ...variant,
    position: variant.position ? variant.position.toString() : null,
    createdAt: variant.createdAt?.toISOString(),
    updatedAt: variant.updatedAt?.toISOString(),
  });
}

export function serializeGeneWithStats(gene: any) {
  return serializeForJSON({
    ...gene,
    startPosition: gene.startPosition ? gene.startPosition.toString() : null,
    endPosition: gene.endPosition ? gene.endPosition.toString() : null,
    variantCount: gene.variantCount || 0,
    pathogenicCount: gene.pathogenicCount || 0,
    createdAt: gene.createdAt?.toISOString(),
    updatedAt: gene.updatedAt?.toISOString(),
  });
}

export function serializeVariantWithGene(variant: any) {
  return serializeForJSON({
    ...variant,
    position: variant.position ? variant.position.toString() : null,
    gene: variant.gene ? serializeGene(variant.gene) : null,
    annotationsCount: variant.annotationsCount || 0,
    createdAt: variant.createdAt?.toISOString(),
    updatedAt: variant.updatedAt?.toISOString(),
  });
}

// Response formatter for API responses
export function createAPIResponse<T>(
  data: T,
  meta?: any,
  status: 'success' | 'error' = 'success'
) {
  return {
    status,
    data: serializeForJSON(data),
    meta: meta ? serializeForJSON(meta) : undefined,
  };
}

// Pagination response formatter - FIXED
export function createPaginatedResponse<T>(
  data: T[],
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }
) {
  return {
    status: 'success',
    data: serializeForJSON(data), // Apply serialization to data array
    meta: serializeForJSON(meta),  // Apply serialization to meta
  };
}