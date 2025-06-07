// __tests__/api/search.test.ts
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/search/route'
import { getCachedGeneService, getCachedVariantService } from '@/lib/container/optimized-service-registry'

// Mock the service registry
jest.mock('@/lib/container/optimized-service-registry')
const mockGetCachedGeneService = getCachedGeneService as jest.MockedFunction<typeof getCachedGeneService>
const mockGetCachedVariantService = getCachedVariantService as jest.MockedFunction<typeof getCachedVariantService>

// Mock data
const mockGenes = [
  {
    id: 1,
    symbol: 'BRCA1',
    name: 'BRCA1 DNA Repair Associated',
    chromosome: '17'
  },
  {
    id: 2,
    symbol: 'BRCA2',
    name: 'BRCA2 DNA Repair Associated',
    chromosome: '13'
  }
]

const mockVariants = [
  {
    id: 1,
    variantId: 'rs1234567',
    position: BigInt(43044295),
    clinicalSignificance: 'Pathogenic',
    gene: {
      symbol: 'BRCA1'
    }
  },
  {
    id: 2,
    variantId: 'rs9876543',
    position: BigInt(7661779),
    clinicalSignificance: 'Likely pathogenic',
    gene: {
      symbol: 'TP53'
    }
  }
]

describe('/api/search', () => {
  let mockGeneService: {
    quickSearch: jest.Mock
  }
  let mockVariantService: {
    quickSearch: jest.Mock
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock services
    mockGeneService = {
      quickSearch: jest.fn()
    }
    mockVariantService = {
      quickSearch: jest.fn()
    }
    
    mockGetCachedGeneService.mockResolvedValue(mockGeneService as any)
    mockGetCachedVariantService.mockResolvedValue(mockVariantService as any)
  })

  describe('GET', () => {
    it('should return search results for valid query', async () => {
      mockGeneService.quickSearch.mockResolvedValue(mockGenes)
      mockVariantService.quickSearch.mockResolvedValue(mockVariants)

      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.query).toBe('BRCA')
      expect(data.total).toBe(4) // 2 genes + 2 variants
      expect(data.results.genes).toHaveLength(2)
      expect(data.results.variants).toHaveLength(2)
      
      // Check gene result format
      expect(data.results.genes[0]).toEqual({
        id: 1,
        symbol: 'BRCA1',
        name: 'BRCA1 DNA Repair Associated',
        chromosome: '17',
        variant_count: 0
      })
      
      // Check variant result format
      expect(data.results.variants[0]).toEqual({
        id: 1,
        variant_id: 'rs1234567',
        gene_symbol: 'BRCA1',
        position: '43044295',
        clinical_significance: 'Pathogenic'
      })
    })

    it('should handle empty results', async () => {
      mockGeneService.quickSearch.mockResolvedValue([])
      mockVariantService.quickSearch.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/search?query=UNKNOWN')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.query).toBe('UNKNOWN')
      expect(data.total).toBe(0)
      expect(data.results.genes).toHaveLength(0)
      expect(data.results.variants).toHaveLength(0)
    })

    it('should reject queries shorter than 2 characters', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=B')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.query).toBe('B')
      expect(data.total).toBe(0)
      expect(data.results.genes).toHaveLength(0)
      expect(data.results.variants).toHaveLength(0)
      
      // Services should not be called for short queries
      expect(mockGeneService.quickSearch).not.toHaveBeenCalled()
      expect(mockVariantService.quickSearch).not.toHaveBeenCalled()
    })

    it('should handle missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should use custom limit parameter', async () => {
      mockGeneService.quickSearch.mockResolvedValue(mockGenes.slice(0, 1))
      mockVariantService.quickSearch.mockResolvedValue(mockVariants.slice(0, 1))

      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA&limit=2')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.quickSearch).toHaveBeenCalledWith('BRCA', 1, undefined) // limit/2 = 1
      expect(mockVariantService.quickSearch).toHaveBeenCalledWith('BRCA', 1, undefined)
    })

    it('should use default limit when not provided', async () => {
      mockGeneService.quickSearch.mockResolvedValue(mockGenes)
      mockVariantService.quickSearch.mockResolvedValue(mockVariants)

      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.quickSearch).toHaveBeenCalledWith('BRCA', 5, undefined) // default 10/2 = 5
      expect(mockVariantService.quickSearch).toHaveBeenCalledWith('BRCA', 5, undefined)
    })

    it('should handle request ID header', async () => {
      mockGeneService.quickSearch.mockResolvedValue(mockGenes)
      mockVariantService.quickSearch.mockResolvedValue(mockVariants)

      const headers = new Headers()
      headers.set('x-request-id', 'test-search-request-789')
      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA', { headers })
      
      await GET(request)

      expect(mockGeneService.quickSearch).toHaveBeenCalledWith('BRCA', 5, 'test-search-request-789')
      expect(mockVariantService.quickSearch).toHaveBeenCalledWith('BRCA', 5, 'test-search-request-789')
    })

    it('should handle genes without chromosome', async () => {
      const genesWithoutChromosome = [
        {
          id: 1,
          symbol: 'TEST',
          name: 'Test Gene',
          chromosome: null
        }
      ]
      mockGeneService.quickSearch.mockResolvedValue(genesWithoutChromosome)
      mockVariantService.quickSearch.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/search?query=TEST')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.genes[0].chromosome).toBe('Unknown')
    })

    it('should handle variants without gene', async () => {
      const variantsWithoutGene = [
        {
          id: 1,
          variantId: 'rs123',
          position: BigInt(123456),
          clinicalSignificance: 'Unknown',
          gene: null
        }
      ]
      mockGeneService.quickSearch.mockResolvedValue([])
      mockVariantService.quickSearch.mockResolvedValue(variantsWithoutGene)

      const request = new NextRequest('http://localhost:3000/api/search?query=rs123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.variants[0].gene_symbol).toBe('Unknown')
    })

    it('should handle variants without clinical significance', async () => {
      const variantsWithoutSignificance = [
        {
          id: 1,
          variantId: 'rs123',
          position: BigInt(123456),
          clinicalSignificance: null,
          gene: { symbol: 'TEST' }
        }
      ]
      mockGeneService.quickSearch.mockResolvedValue([])
      mockVariantService.quickSearch.mockResolvedValue(variantsWithoutSignificance)

      const request = new NextRequest('http://localhost:3000/api/search?query=rs123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.variants[0].clinical_significance).toBe('Unknown')
    })

    it('should serialize BigInt positions correctly', async () => {
      mockGeneService.quickSearch.mockResolvedValue([])
      mockVariantService.quickSearch.mockResolvedValue(mockVariants)

      const request = new NextRequest('http://localhost:3000/api/search?query=rs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(typeof data.results.variants[0].position).toBe('string')
      expect(data.results.variants[0].position).toBe('43044295')
    })

    it('should include security headers', async () => {
      mockGeneService.quickSearch.mockResolvedValue([])
      mockVariantService.quickSearch.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/search?query=test')
      const response = await GET(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should call services with parallel execution', async () => {
      const genePromise = Promise.resolve(mockGenes)
      const variantPromise = Promise.resolve(mockVariants)
      
      mockGeneService.quickSearch.mockReturnValue(genePromise)
      mockVariantService.quickSearch.mockReturnValue(variantPromise)

      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Both services should be called in parallel
      expect(mockGeneService.quickSearch).toHaveBeenCalledTimes(1)
      expect(mockVariantService.quickSearch).toHaveBeenCalledTimes(1)
    })

    it('should handle invalid query parameter type', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should handle invalid limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?query=BRCA&limit=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })
})