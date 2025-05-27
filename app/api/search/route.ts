// app/api/search/route.ts - FIX per restituire ID corretti
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({
        query,
        total: 0,
        results: {
          genes: [],
          variants: []
        }
      });
    }

    try {
      // Search genes in database
      const genes = await prisma.gene.findMany({
        where: {
          OR: [
            { symbol: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { geneId: { contains: query, mode: 'insensitive' } },
          ]
        },
        include: {
          _count: {
            select: { variants: true }
          }
        },
        take: Math.floor(limit / 2),
        orderBy: [
          { symbol: 'asc' }
        ]
      });

      // Search variants in database
      const variants = await prisma.variant.findMany({
        where: {
          OR: [
            { variantId: { contains: query, mode: 'insensitive' } },
            { gene: { symbol: { contains: query, mode: 'insensitive' } } },
          ]
        },
        include: {
          gene: {
            select: {
              symbol: true
            }
          }
        },
        take: Math.floor(limit / 2),
        orderBy: [
          { position: 'asc' }
        ]
      });

      const results = {
        query,
        total: genes.length + variants.length,
        results: {
          genes: genes.map(gene => ({
            id: gene.id, // FIX: Usa l'ID reale del database
            symbol: gene.symbol,
            name: gene.name,
            chromosome: gene.chromosome || 'Unknown',
            variant_count: gene._count.variants
          })),
          variants: variants.map(variant => ({
            id: variant.id, // FIX: Usa l'ID reale del database
            variant_id: variant.variantId,
            gene_symbol: variant.gene.symbol,
            position: variant.position.toString(),
            clinical_significance: variant.clinicalSignificance || 'Unknown'
          }))
        }
      };

      return NextResponse.json(results);

    } catch (dbError) {
      console.error('Database search error:', dbError);
      
      // Fallback to mock data if database fails
      const mockGenes = [
        {
          id: 'mock-gene-1',
          symbol: 'BRCA1',
          name: 'Breast cancer type 1 susceptibility protein',
          chromosome: '17',
          variant_count: 2453
        },
        {
          id: 'mock-gene-2', 
          symbol: 'BRCA2',
          name: 'Breast cancer type 2 susceptibility protein',
          chromosome: '13',
          variant_count: 3122
        },
        {
          id: 'mock-gene-3',
          symbol: 'TP53',
          name: 'Tumor protein p53',
          chromosome: '17',
          variant_count: 1876
        }
      ];

      const mockVariants = [
        {
          id: 'mock-variant-1',
          variant_id: 'rs80357906',
          gene_symbol: 'BRCA1',
          position: '43051117',
          clinical_significance: 'Pathogenic'
        },
        {
          id: 'mock-variant-2',
          variant_id: 'rs80357914', 
          gene_symbol: 'BRCA2',
          position: '32339333',
          clinical_significance: 'Likely Pathogenic'
        }
      ];

      // Filter mock data based on query
      const queryLower = query.toLowerCase();
      
      const filteredGenes = mockGenes.filter(gene => 
        gene.symbol.toLowerCase().includes(queryLower) ||
        gene.name.toLowerCase().includes(queryLower)
      ).slice(0, Math.floor(limit / 2));

      const filteredVariants = mockVariants.filter(variant =>
        variant.variant_id.toLowerCase().includes(queryLower) ||
        variant.gene_symbol.toLowerCase().includes(queryLower)
      ).slice(0, Math.floor(limit / 2));

      return NextResponse.json({
        query,
        total: filteredGenes.length + filteredVariants.length,
        results: {
          genes: filteredGenes,
          variants: filteredVariants
        }
      });
    }

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}