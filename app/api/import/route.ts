// app/api/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminApiMiddlewareChain, withMiddlewareChain } from '@/lib/middleware/presets';
import { getGeneService, getVariantService } from '@/lib/container/optimized-service-registry';
import { validateFileUpload, addSecurityHeaders } from '@/lib/validation';
import { VCFParser } from '@/lib/vcf-parser';

async function importHandler(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || undefined;
  
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string;

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    );
  }

  // Validate file
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

  // Get services
  const [geneService, variantService] = await Promise.all([
    getGeneService(),
    getVariantService()
  ]);

  // Process VCF files
  if (file.name.endsWith('.vcf') || type === 'vcf') {
    try {
      const parsedVCF = await VCFParser.parseVCF(fileContent);
      results.total = parsedVCF.records.length;

      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < parsedVCF.records.length; i += batchSize) {
        const batch = parsedVCF.records.slice(i, i + batchSize);
        
        for (const record of batch) {
          try {
            // Convert VCF record to variant data
            const variantData = VCFParser.convertToVariantData(record);
            
            // Find or create gene
            let gene = await geneService.getGeneBySymbol(
              record.info?.GENE_SYMBOL || `GENE_${record.chromosome}_${record.position}`,
              requestId
            );
            
            if (!gene) {
              // Create gene if not found
              gene = await geneService.createGene({
                geneId: `ENSG_${record.chromosome}_${record.position}`,
                symbol: record.info?.GENE_SYMBOL || `GENE_${record.chromosome}_${record.position}`,
                name: `Gene at ${record.chromosome}:${record.position}`,
                chromosome: record.chromosome,
                startPosition: BigInt(Math.max(1, record.position - 1000)),
                endPosition: BigInt(record.position + 1000),
                strand: '+',
                biotype: 'protein_coding',
                description: 'Gene inferred from VCF variant',
              }, requestId);
            }

            // Create variant with proper type conversion
            await variantService.createVariant({
              ...variantData,
              geneId: gene.id,
              frequency: variantData.frequency || undefined, // Convert null to undefined
              clinicalSignificance: variantData.clinicalSignificance || undefined, // Convert null to undefined
            }, requestId);

            results.successful++;

          } catch (error) {
            results.failed++;
            results.errors.push({
              record: record.id || `${record.chromosome}:${record.position}`,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to parse VCF file', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }
  }

  const response = NextResponse.json({
    status: 'success',
    message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
    results
  });

  return addSecurityHeaders(response);
}

const middlewareChain = createAdminApiMiddlewareChain();
export const POST = withMiddlewareChain(middlewareChain, importHandler);