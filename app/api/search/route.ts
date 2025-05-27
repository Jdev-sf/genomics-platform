import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

    // Mock data per demo - sostituire con vera query al database
    const mockGenes = [
      {
        id: 'gene1',
        symbol: 'BRCA1',
        name: 'Breast cancer type 1 susceptibility protein',
        chromosome: '17',
        variant_count: 2453
      },
      {
        id: 'gene2',
        symbol: 'BRCA2',
        name: 'Breast cancer type 2 susceptibility protein',
        chromosome: '13',
        variant_count: 3122
      },
      {
        id: 'gene3',
        symbol: 'TP53',
        name: 'Tumor protein p53',
        chromosome: '17',
        variant_count: 1876
      },
      {
        id: 'gene4',
        symbol: 'EGFR',
        name: 'Epidermal growth factor receptor',
        chromosome: '7',
        variant_count: 921
      }
    ];

    const mockVariants = [
      {
        id: 'var1',
        variant_id: 'rs80357906',
        gene_symbol: 'BRCA1',
        position: '43051117',
        clinical_significance: 'Pathogenic'
      },
      {
        id: 'var2',
        variant_id: 'rs80357914',
        gene_symbol: 'BRCA2',
        position: '32339333',
        clinical_significance: 'Likely Pathogenic'
      },
      {
        id: 'var3',
        variant_id: 'rs121913343',
        gene_symbol: 'TP53',
        position: '7676040',
        clinical_significance: 'Pathogenic'
      }
    ];

    // Filtro basato sulla query
    const queryLower = query.toLowerCase();
    
    const filteredGenes = mockGenes.filter(gene => 
      gene.symbol.toLowerCase().includes(queryLower) ||
      gene.name.toLowerCase().includes(queryLower)
    ).slice(0, Math.floor(limit / 2));

    const filteredVariants = mockVariants.filter(variant =>
      variant.variant_id.toLowerCase().includes(queryLower) ||
      variant.gene_symbol.toLowerCase().includes(queryLower)
    ).slice(0, Math.floor(limit / 2));

    const results = {
      query,
      total: filteredGenes.length + filteredVariants.length,
      results: {
        genes: filteredGenes,
        variants: filteredVariants
      }
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}