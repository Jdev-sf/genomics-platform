// __tests__/api/genes.test.ts
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/genes/route'
import { getOptimizedGeneService } from '@/lib/container/optimized-service-registry'

// Mock the service registry
jest.mock('@/lib/container/optimized-service-registry')
const mockGetOptimizedGeneService = getOptimizedGeneService as jest.MockedFunction<typeof getOptimizedGeneService>

// Mock data
const mockGenesData = {
  data: [
    {
      id: 1,
      symbol: 'BRCA1',
      name: 'BRCA1 DNA Repair Associated',
      chromosome: '17',
      startPosition: BigInt(43044295),
      endPosition: BigInt(43125483),
      strand: '+',
      biotype: 'protein_coding',
      description: 'Tumor suppressor gene',
      aliases: ['BRCC1'],
      _count: { variants: 150 }
    },
    {
      id: 2,
      symbol: 'TP53',
      name: 'Tumor Protein P53',
      chromosome: '17',
      startPosition: BigInt(7661779),
      endPosition: BigInt(7687550),
      strand: '-',
      biotype: 'protein_coding',
      description: 'Guardian of the genome',
      aliases: ['P53'],
      _count: { variants: 89 }
    }
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  }
}

describe('/api/genes', () => {
  let mockGeneService: {
    searchGenes: jest.Mock
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock service
    mockGeneService = {
      searchGenes: jest.fn()
    }
    
    mockGetOptimizedGeneService.mockResolvedValue(mockGeneService as any)
  })

  describe('GET', () => {
    it('should return genes with default parameters', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
      expect(data.data).toHaveLength(2)
      expect(data.meta.total).toBe(2)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50
        }),
        undefined
      )
    })

    it('should handle search parameter', async () => {
      const filteredData = {
        ...mockGenesData,
        data: [mockGenesData.data[0]], // Only BRCA1
        meta: { ...mockGenesData.meta, total: 1 }
      }
      mockGeneService.searchGenes.mockResolvedValue(filteredData)

      const request = new NextRequest('http://localhost:3000/api/genes?search=BRCA1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].symbol).toBe('BRCA1')
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'BRCA1'
        }),
        undefined
      )
    })

    it('should handle chromosome filter', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes?chromosome=17')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          chromosome: '17'
        }),
        undefined
      )
    })

    it('should handle biotype filter', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes?biotype=protein_coding')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          biotype: 'protein_coding'
        }),
        undefined
      )
    })

    it('should handle hasVariants filter', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes?hasVariants=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          hasVariants: true
        }),
        undefined
      )
    })

    it('should handle pagination parameters', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes?page=2&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10
        }),
        undefined
      )
    })

    it('should handle multiple filters', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes?search=BRCA&chromosome=17&biotype=protein_coding&hasVariants=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'BRCA',
          chromosome: '17',
          biotype: 'protein_coding',
          hasVariants: true
        }),
        undefined
      )
    })

    it('should handle service errors', async () => {
      mockGeneService.searchGenes.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/genes')
      
      // The middleware should catch and handle errors
      await expect(GET(request)).rejects.toThrow('Database connection failed')
    })

    it('should include security headers', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes')
      const response = await GET(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should handle request ID header', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const headers = new Headers()
      headers.set('x-request-id', 'test-request-123')
      const request = new NextRequest('http://localhost:3000/api/genes', { headers })
      
      await GET(request)

      expect(mockGeneService.searchGenes).toHaveBeenCalledWith(
        expect.any(Object),
        'test-request-123'
      )
    })

    it('should serialize BigInt values correctly', async () => {
      mockGeneService.searchGenes.mockResolvedValue(mockGenesData)

      const request = new NextRequest('http://localhost:3000/api/genes')
      const response = await GET(request)
      const data = await response.json()

      // BigInt values should be serialized as strings
      expect(typeof data.data[0].startPosition).toBe('string')
      expect(typeof data.data[0].endPosition).toBe('string')
      expect(data.data[0].startPosition).toBe('43044295')
      expect(data.data[0].endPosition).toBe('43125483')
    })
  })
})