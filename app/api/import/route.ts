// app/api/import/route.ts - COMPLETO con supporto VCF
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VCFParser } from '@/lib/vcf-parser';
import { z } from 'zod';

// Schema per validazione CSV/JSON esistenti
const geneImportSchema = z.object({
  gene_id: z.string(),
  symbol: z.string(),
  name: z.string(),
  chromosome: z.string(),
  start_position: z.coerce.number().optional(),
  end_position: z.coerce.number().optional(),
  strand: z.string().optional(),
  biotype: z.string().optional(),
  description: z.string().optional(),
});

const variantImportSchema = z.object({
  variant_id: z.string(),
  gene_symbol: z.string(),
  chromosome: z.string(),
  position: z.coerce.number(),
  reference_allele: z.string(),
  alternate_allele: z.string(),
  variant_type: z.string().optional(),
  consequence: z.string().optional(),
  impact: z.string().optional(),
  protein_change: z.string().optional(),
  clinical_significance: z.string().optional(),
  frequency: z.coerce.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions
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
    const type = formData.get('type') as string; // 'genes', 'variants', or 'vcf'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let data: any[];
    let results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      warnings: [] as any[],
    };

    // Generate unique job ID
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Handle different file formats
    if (file.name.endsWith('.vcf') || type === 'vcf') {
      // VCF Processing
      try {
        console.log('Processing VCF file...');
        
        const parsedVCF = await VCFParser.parseVCF(fileContent);
        results.total = parsedVCF.records.length;

        console.log(`Parsed ${parsedVCF.records.length} VCF records`);
        console.log('VCF Stats:', parsedVCF.stats);

        // Process VCF records in batches
        const batchSize = 100;
        for (let i = 0; i < parsedVCF.records.length; i += batchSize) {
          const batch = parsedVCF.records.slice(i, i + batchSize);
          
          for (const record of batch) {
            try {
              // Try to find or create associated gene
              let gene = null;
              
              // Look for gene annotation in VCF INFO field
              if (record.info?.GENE_SYMBOL || record.info?.SYMBOL) {
                const geneSymbol = record.info.GENE_SYMBOL || record.info.SYMBOL;
                gene = await prisma.gene.findFirst({
                  where: { symbol: geneSymbol }
                });
              }

              // If no gene found, try to infer from position
              if (!gene) {
                gene = await prisma.gene.findFirst({
                  where: {
                    chromosome: record.chromosome,
                    startPosition: { lte: record.position },
                    endPosition: { gte: record.position }
                  }
                });
              }

              // Create placeholder gene if none found
              if (!gene) {
                const geneSymbol = record.info?.GENE_SYMBOL || record.info?.SYMBOL || `GENE_${record.chromosome}_${record.position}`;
                
                // Check if gene already exists before creating
                const existingGene = await prisma.gene.findFirst({
                  where: { symbol: geneSymbol }
                });

                if (!existingGene) {
                  gene = await prisma.gene.create({
                    data: {
                      geneId: `ENSG_${record.chromosome}_${record.position}`,
                      symbol: geneSymbol,
                      name: `Gene at ${record.chromosome}:${record.position}`,
                      chromosome: record.chromosome,
                      startPosition: BigInt(Math.max(1, record.position - 1000)),
                      endPosition: BigInt(record.position + 1000),
                      strand: '+',
                      biotype: 'protein_coding',
                      description: `Gene inferred from VCF variant at ${record.chromosome}:${record.position}`,
                    }
                  });
                } else {
                  gene = existingGene;
                }
              }

              // Convert VCF record to variant data
              const variantData = VCFParser.convertToVariantData(record, gene.id);

              // Check for existing variant
              const existingVariant = await prisma.variant.findFirst({
                where: {
                  OR: [
                    { variantId: variantData.variantId },
                    {
                      chromosome: record.chromosome,
                      position: variantData.position,
                      referenceAllele: variantData.referenceAllele,
                      alternateAllele: variantData.alternateAllele
                    }
                  ]
                }
              });

              if (existingVariant) {
                results.warnings.push({
                  record: variantData.variantId,
                  message: 'Variant already exists, skipping'
                });
                continue;
              }

              // Create new variant
              await prisma.variant.create({
                data: {
                  ...variantData,
                  consequence: record.info?.CONSEQUENCE || record.info?.CSQ || null,
                  impact: record.info?.IMPACT || null,
                  proteinChange: record.info?.HGVS_P || record.info?.HGVSp || null,
                  transcriptId: record.info?.TRANSCRIPT_ID || record.info?.Feature || null,
                }
              });

              results.successful++;

            } catch (error) {
              console.error(`Error processing VCF record:`, error);
              results.failed++;
              results.errors.push({
                record: record.id || `${record.chromosome}:${record.position}`,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }

      } catch (error) {
        console.error('VCF parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse VCF file', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        );
      }

    } else if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      // Existing CSV/JSON processing logic
      if (file.name.endsWith('.json')) {
        try {
          data = JSON.parse(fileContent);
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid JSON format' },
            { status: 400 }
          );
        }
      } else {
        // CSV parsing with better error handling
        try {
          const lines = fileContent.split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            return NextResponse.json(
              { error: 'Empty CSV file' },
              { status: 400 }
            );
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          data = lines.slice(1).map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj: any = {};
            headers.forEach((header, headerIndex) => {
              let value = values[headerIndex] || '';
              
              // Keep values as strings - zod will handle coercion
              // No automatic number conversion here to avoid type issues
              
              obj[header] = value === '' ? null : value;
            });
            return obj;
          }).filter(obj => Object.values(obj).some(val => val !== null && val !== ''));
        } catch (error) {
          return NextResponse.json(
            { error: 'Failed to parse CSV file' },
            { status: 400 }
          );
        }
      }

      results.total = data.length;

      // Process based on type
      if (type === 'genes') {
        for (const item of data) {
          try {
            const validatedGene = geneImportSchema.parse(item);
            
            // Check for existing gene
            const existingGene = await prisma.gene.findFirst({
              where: {
                OR: [
                  { geneId: validatedGene.gene_id },
                  { symbol: validatedGene.symbol }
                ]
              }
            });

            if (existingGene) {
              // Update existing gene
              await prisma.gene.update({
                where: { id: existingGene.id },
                data: {
                  name: validatedGene.name,
                  chromosome: validatedGene.chromosome,
                  startPosition: validatedGene.start_position ? BigInt(validatedGene.start_position) : null,
                  endPosition: validatedGene.end_position ? BigInt(validatedGene.end_position) : null,
                  strand: validatedGene.strand || '+',
                  biotype: validatedGene.biotype || 'protein_coding',
                  description: validatedGene.description,
                }
              });
              
              results.warnings.push({
                record: validatedGene.symbol,
                message: 'Gene already exists, updated'
              });
            } else {
              // Create new gene
              await prisma.gene.create({
                data: {
                  geneId: validatedGene.gene_id,
                  symbol: validatedGene.symbol,
                  name: validatedGene.name,
                  chromosome: validatedGene.chromosome,
                  startPosition: validatedGene.start_position ? BigInt(validatedGene.start_position) : null,
                  endPosition: validatedGene.end_position ? BigInt(validatedGene.end_position) : null,
                  strand: validatedGene.strand || '+',
                  biotype: validatedGene.biotype || 'protein_coding',
                  description: validatedGene.description,
                }
              });
            }

            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              record: item.symbol || item.gene_id || 'Unknown',
              error: error instanceof Error ? error.message : 'Validation error'
            });
          }
        }

      } else if (type === 'variants') {
        for (const item of data) {
          try {
            const validatedVariant = variantImportSchema.parse(item);
            
            // Find associated gene
            const gene = await prisma.gene.findFirst({
              where: { symbol: validatedVariant.gene_symbol }
            });

            if (!gene) {
              results.failed++;
              results.errors.push({
                record: validatedVariant.variant_id,
                error: `Gene not found: ${validatedVariant.gene_symbol}`
              });
              continue;
            }

            // Check for existing variant
            const existingVariant = await prisma.variant.findFirst({
              where: {
                OR: [
                  { variantId: validatedVariant.variant_id },
                  {
                    geneId: gene.id,
                    chromosome: validatedVariant.chromosome,
                    position: BigInt(validatedVariant.position),
                    referenceAllele: validatedVariant.reference_allele,
                    alternateAllele: validatedVariant.alternate_allele
                  }
                ]
              }
            });

            if (existingVariant) {
              // Update existing variant
              await prisma.variant.update({
                where: { id: existingVariant.id },
                data: {
                  variantType: validatedVariant.variant_type || 'SNV',
                  consequence: validatedVariant.consequence,
                  impact: validatedVariant.impact,
                  proteinChange: validatedVariant.protein_change,
                  clinicalSignificance: validatedVariant.clinical_significance,
                  frequency: validatedVariant.frequency,
                }
              });
              
              results.warnings.push({
                record: validatedVariant.variant_id,
                message: 'Variant already exists, updated'
              });
            } else {
              // Create new variant
              await prisma.variant.create({
                data: {
                  variantId: validatedVariant.variant_id,
                  geneId: gene.id,
                  chromosome: validatedVariant.chromosome,
                  position: BigInt(validatedVariant.position),
                  referenceAllele: validatedVariant.reference_allele,
                  alternateAllele: validatedVariant.alternate_allele,
                  variantType: validatedVariant.variant_type || 'SNV',
                  consequence: validatedVariant.consequence,
                  impact: validatedVariant.impact,
                  proteinChange: validatedVariant.protein_change,
                  clinicalSignificance: validatedVariant.clinical_significance,
                  frequency: validatedVariant.frequency,
                }
              });
            }

            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              record: item.variant_id || 'Unknown',
              error: error instanceof Error ? error.message : 'Validation error'
            });
          }
        }
      }

    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload CSV, JSON, or VCF files.' },
        { status: 400 }
      );
    }

    // Log import activity
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'import',
          entityType: type,
          entityId: jobId,
          changes: results,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
        },
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
    }

    // Log import results
    console.log('Import completed:', results);

    return NextResponse.json({
      status: 'success',
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      jobId,
      results: results
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}