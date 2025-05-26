import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema per validazione CSV/JSON
const geneImportSchema = z.object({
  gene_id: z.string(),
  symbol: z.string(),
  name: z.string(),
  chromosome: z.string(),
  start_position: z.number().optional(),
  end_position: z.number().optional(),
  strand: z.string().optional(),
  biotype: z.string().optional(),
  description: z.string().optional(),
});

const variantImportSchema = z.object({
  variant_id: z.string(),
  gene_symbol: z.string(),
  chromosome: z.string(),
  position: z.number(),
  reference_allele: z.string(),
  alternate_allele: z.string(),
  variant_type: z.string().optional(),
  consequence: z.string().optional(),
  impact: z.string().optional(),
  protein_change: z.string().optional(),
  clinical_significance: z.string().optional(),
  frequency: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or researcher role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });

    if (!user || !['admin', 'researcher'].includes(user.role.name)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'genes' or 'variants'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let data: any[];

    // Parse file based on type
    if (file.name.endsWith('.json')) {
      data = JSON.parse(fileContent);
    } else if (file.name.endsWith('.csv')) {
      // Simple CSV parsing (in production, use a proper CSV parser)
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {} as any);
        });
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Use JSON or CSV.' },
        { status: 400 }
      );
    }

    // Validate and import data
    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
    };

    if (type === 'genes') {
      for (const item of data) {
        try {
          const validated = geneImportSchema.parse(item);
          
          await prisma.gene.upsert({
            where: { geneId: validated.gene_id },
            update: {
              symbol: validated.symbol,
              name: validated.name,
              chromosome: validated.chromosome,
              startPosition: validated.start_position ? BigInt(validated.start_position) : null,
              endPosition: validated.end_position ? BigInt(validated.end_position) : null,
              strand: validated.strand,
              biotype: validated.biotype,
              description: validated.description,
            },
            create: {
              geneId: validated.gene_id,
              symbol: validated.symbol,
              name: validated.name,
              chromosome: validated.chromosome,
              startPosition: validated.start_position ? BigInt(validated.start_position) : null,
              endPosition: validated.end_position ? BigInt(validated.end_position) : null,
              strand: validated.strand,
              biotype: validated.biotype,
              description: validated.description,
            },
          });
          
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: results.successful + results.failed,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: item,
          });
        }
      }
    } else if (type === 'variants') {
      for (const item of data) {
        try {
          const validated = variantImportSchema.parse(item);
          
          // Find gene by symbol
          const gene = await prisma.gene.findFirst({
            where: { symbol: validated.gene_symbol },
          });
          
          if (!gene) {
            throw new Error(`Gene ${validated.gene_symbol} not found`);
          }
          
          await prisma.variant.upsert({
            where: { variantId: validated.variant_id },
            update: {
              chromosome: validated.chromosome,
              position: BigInt(validated.position),
              referenceAllele: validated.reference_allele,
              alternateAllele: validated.alternate_allele,
              variantType: validated.variant_type,
              consequence: validated.consequence,
              impact: validated.impact,
              proteinChange: validated.protein_change,
              clinicalSignificance: validated.clinical_significance,
              frequency: validated.frequency,
            },
            create: {
              variantId: validated.variant_id,
              geneId: gene.id,
              chromosome: validated.chromosome,
              position: BigInt(validated.position),
              referenceAllele: validated.reference_allele,
              alternateAllele: validated.alternate_allele,
              variantType: validated.variant_type,
              consequence: validated.consequence,
              impact: validated.impact,
              proteinChange: validated.protein_change,
              clinicalSignificance: validated.clinical_significance,
              frequency: validated.frequency,
            },
          });
          
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: results.successful + results.failed,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: item,
          });
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid import type. Use "genes" or "variants".' },
        { status: 400 }
      );
    }

    // Log import activity
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'import',
        entityType: type,
        entityId: 'bulk',
        changes: results,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      status: 'success',
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}