import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import prisma from '@/lib/prisma-optimized';

const exportSchema = z.object({
  type: z.enum(['genes', 'variants']),
  format: z.enum(['csv', 'json']),
  ids: z.string().optional(),
  filters: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryResult = exportSchema.safeParse({
      type: searchParams.get('type') || 'genes',
      format: searchParams.get('format') || 'csv',
      ids: searchParams.get('ids') || undefined,
      filters: searchParams.get('filters') || undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid export parameters' },
        { status: 400 }
      );
    }

    const { type, format, ids, filters } = queryResult.data;
    let data: any[] = [];

    if (type === 'genes') {
      const where: any = {};
      if (ids) {
        where.id = { in: ids.split(',') };
      }
      if (filters) {
        const filterObj = JSON.parse(filters);
        if (filterObj.chromosome) where.chromosome = filterObj.chromosome;
      }

      const genes = await prisma.gene.findMany({
        where,
        include: {
          _count: {
            select: { variants: true }
          }
        }
      });

      data = genes.map(gene => ({
        gene_id: gene.geneId,
        symbol: gene.symbol,
        name: gene.name,
        chromosome: gene.chromosome,
        start_position: gene.startPosition?.toString(),
        end_position: gene.endPosition?.toString(),
        strand: gene.strand,
        biotype: gene.biotype,
        description: gene.description,
        variant_count: gene._count.variants,
      }));
    } else if (type === 'variants') {
      const where: any = {};
      if (ids) {
        where.id = { in: ids.split(',') };
      }
      if (filters) {
        const filterObj = JSON.parse(filters);
        if (filterObj.chromosome) where.chromosome = filterObj.chromosome;
        if (filterObj.clinicalSignificance) where.clinicalSignificance = filterObj.clinicalSignificance;
        if (filterObj.geneId) where.geneId = filterObj.geneId;
      }

      const variants = await prisma.variant.findMany({
        where,
        include: {
          gene: {
            select: {
              symbol: true,
              name: true,
            }
          }
        }
      });

      data = variants.map(variant => ({
        variant_id: variant.variantId,
        gene_symbol: variant.gene.symbol,
        gene_name: variant.gene.name,
        chromosome: variant.chromosome,
        position: variant.position.toString(),
        reference_allele: variant.referenceAllele,
        alternate_allele: variant.alternateAllele,
        variant_type: variant.variantType,
        consequence: variant.consequence,
        impact: variant.impact,
        protein_change: variant.proteinChange,
        clinical_significance: variant.clinicalSignificance,
        frequency: variant.frequency,
      }));
    }

    // Log export activity
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'export',
        entityType: type,
        entityId: ids || 'all',
        changes: { count: data.length, format },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    if (format === 'json') {
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="${type}_export_${Date.now()}.json"`,
        },
      });
    } else {
      // Convert to CSV
      if (data.length === 0) {
        return new NextResponse('No data to export', { status: 404 });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value ?? '';
          }).join(',')
        )
      ];

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_export_${Date.now()}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}