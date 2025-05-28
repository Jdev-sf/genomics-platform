import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withRateLimit } from '@/lib/rate-limit-simple';
import { 
  validateFileUpload, 
  addSecurityHeaders 
} from '@/lib/validation';
import { VCFParser } from '@/lib/vcf-parser';

const MAX_BATCH_SIZE = 1000; // Process in batches to prevent memory issues

async function importHandler(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions for import
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
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file upload with security checks
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      warnings: [] as any[],
    };

    const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process different file types with enhanced security
    if (file.name.endsWith('.vcf') || type === 'vcf') {
      try {
        const parsedVCF = await VCFParser.parseVCF(fileContent);
        results.total = parsedVCF.records.length;

        // Process VCF in secure batches
        for (let i = 0; i < parsedVCF.records.length; i += MAX_BATCH_SIZE) {
          const batch = parsedVCF.records.slice(i, i + MAX_BATCH_SIZE);
          
          // Use transaction for data integrity
          await prisma.$transaction(async (tx) => {
            for (const record of batch) {
              try {
                // Validate VCF record data
                if (!record.chromosome || !record.position || !record.reference || !record.alternate) {
                  results.failed++;
                  results.errors.push({
                    record: record.id || `${record.chromosome}:${record.position}`,
                    error: 'Missing required VCF fields'
                  });
                  continue;
                }

                // Find or create gene with validation
                let gene = await tx.gene.findFirst({
                  where: {
                    OR: [
                      { chromosome: record.chromosome, startPosition: { lte: record.position }, endPosition: { gte: record.position } },
                      ...(record.info?.GENE_SYMBOL ? [{ symbol: record.info.GENE_SYMBOL }] : [])
                    ]
                  }
                });

                if (!gene && record.info?.GENE_SYMBOL) {
                  gene = await tx.gene.create({
                    data: {
                      geneId: `ENSG_${record.chromosome}_${record.position}`,
                      symbol: record.info.GENE_SYMBOL,
                      name: `Gene at ${record.chromosome}:${record.position}`,
                      chromosome: record.chromosome,
                      startPosition: BigInt(Math.max(1, record.position - 1000)),
                      endPosition: BigInt(record.position + 1000),
                      strand: '+',
                      biotype: 'protein_coding',
                      description: `Gene inferred from VCF variant`,
                    }
                  });
                }

                if (!gene) {
                  results.failed++;
                  results.errors.push({
                    record: record.id || `${record.chromosome}:${record.position}`,
                    error: 'Could not find or create associated gene'
                  });
                  continue;
                }

                // Create variant with validation
                const variantData = VCFParser.convertToVariantData(record, gene.id);
                
                // Check for duplicate
                const existingVariant = await tx.variant.findFirst({
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

                await tx.variant.create({
                  data: {
                    ...variantData,
                    consequence: record.info?.CONSEQUENCE || null,
                    impact: record.info?.IMPACT || null,
                    proteinChange: record.info?.HGVS_P || null,
                    transcriptId: record.info?.TRANSCRIPT_ID || null,
                  }
                });

                results.successful++;

              } catch (error) {
                results.failed++;
                results.errors.push({
                  record: record.id || `${record.chromosome}:${record.position}`,
                  error: error instanceof Error ? error.message : 'Processing error'
                });
              }
            }
          });
        }

      } catch (error) {
        console.error('VCF parsing error:', error);
        return NextResponse.json(
          { error: 'Failed to parse VCF file', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        );
      }
    }

    // Log import activity with security context
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

    const response = NextResponse.json({
      status: 'success',
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      jobId,
      results
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Import error:', error);
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    );

    return addSecurityHeaders(response);
  }
}

export const POST = withRateLimit('import')(importHandler);