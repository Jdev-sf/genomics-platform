// __tests__/api/variants.test.ts
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/variants/route'
import { getOptimizedVariantService } from '@/lib/container/optimized-service-registry'

// Mock the service registry
jest.mock('@/lib/container/optimized-service-registry')
const mockGetOptimizedVariantService = getOptimizedVariantService as jest.MockedFunction<typeof getOptimizedVariantService>

// Mock data
const mockVariantsData = {
  data: [
    {
      id: 1,
      rsId: 'rs1234567',
      chromosome: '17',
      position: BigInt(43044295),
      refAllele: 'G',
      altAllele: 'A',
      variantType: 'SNV',
      clinicalSignificance: 'Pathogenic',
      alleleFrequency: 0.001,
      impact: 'HIGH',
      consequence: 'missense_variant',
      gene: {
        id: 1,
        symbol: 'BRCA1',
        name: 'BRCA1 DNA Repair Associated'
      },
      annotations: [
        {
          id: 1,
          type: 'clinical',
          value: 'Associated with breast cancer risk',
          source: { name: 'ClinVar' }
        }
      ]
    },
    {
      id: 2,
      rsId: 'rs9876543',
      chromosome: '17',
      position: BigInt(7661779),
      refAllele: 'C',
      altAllele: 'T',
      variantType: 'SNV',
      clinicalSignificance: 'Likely pathogenic',
      alleleFrequency: 0.0005,
      impact: 'MODERATE',
      consequence: 'splice_variant',
      gene: {
        id: 2,
        symbol: 'TP53',
        name: 'Tumor Protein P53'
      },
      annotations: []
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

describe('/api/variants', () => {
  let mockVariantService: {
    searchVariants: jest.Mock
  }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock service
    mockVariantService = {
      searchVariants: jest.fn()
    }
    
    mockGetOptimizedVariantService.mockResolvedValue(mockVariantService as any)
  })

  describe('GET', () => {
    it('should return variants with default parameters', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
      expect(data.data).toHaveLength(2)
      expect(data.meta.total).toBe(2)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 50
        }),
        undefined
      )
    })

    it('should handle search parameter', async () => {
      const filteredData = {
        ...mockVariantsData,
        data: [mockVariantsData.data[0]], // Only BRCA1 variant
        meta: { ...mockVariantsData.meta, total: 1 }
      }
      mockVariantService.searchVariants.mockResolvedValue(filteredData)

      const request = new NextRequest('http://localhost:3000/api/variants?search=rs1234567')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].rsId).toBe('rs1234567')
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'rs1234567'
        }),
        undefined
      )
    })

    it('should handle geneId filter', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?geneId=1')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          geneId: '1'
        }),
        undefined
      )
    })

    it('should handle chromosome filter', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?chromosome=17')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          chromosome: '17'
        }),
        undefined
      )
    })

    it('should handle clinical significance filter', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?clinicalSignificance=Pathogenic')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicalSignificance: 'Pathogenic'
        }),
        undefined
      )
    })

    it('should handle impact filter', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?impact=HIGH')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          impact: 'HIGH'
        }),
        undefined
      )
    })

    it('should handle frequency range filters', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?minFrequency=0.001&maxFrequency=0.01')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          minFrequency: '0.001',
          maxFrequency: '0.01'
        }),
        undefined
      )
    })

    it('should handle consequence filter', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?consequence=missense_variant')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          consequence: 'missense_variant'
        }),
        undefined
      )
    })

    it('should handle pagination parameters', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?page=2&limit=10')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10
        }),
        undefined
      )
    })

    it('should handle multiple filters', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants?search=rs&chromosome=17&clinicalSignificance=Pathogenic&impact=HIGH&minFrequency=0.001')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'rs',
          chromosome: '17',
          clinicalSignificance: 'Pathogenic',
          impact: 'HIGH',
          minFrequency: '0.001'
        }),
        undefined
      )
    })

    it('should handle service errors with error response', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockVariantService.searchVariants.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.message).toBe('Database connection failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in getVariantsHandler:', expect.any(Error))
      
      consoleErrorSpy.mockRestore()
    })

    it('should include security headers', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should handle request ID header', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const headers = new Headers()
      headers.set('x-request-id', 'test-variant-request-456')
      const request = new NextRequest('http://localhost:3000/api/variants', { headers })
      
      await GET(request)

      expect(mockVariantService.searchVariants).toHaveBeenCalledWith(
        expect.any(Object),
        'test-variant-request-456'
      )
    })

    it('should serialize BigInt values correctly', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)
      const data = await response.json()

      // BigInt values should be serialized as strings
      expect(typeof data.data[0].position).toBe('string')
      expect(data.data[0].position).toBe('43044295')
    })

    it('should include gene and annotation relationships', async () => {
      mockVariantService.searchVariants.mockResolvedValue(mockVariantsData)

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)
      const data = await response.json()

      expect(data.data[0].gene).toBeDefined()
      expect(data.data[0].gene.symbol).toBe('BRCA1')
      expect(data.data[0].annotations).toBeDefined()
      expect(Array.isArray(data.data[0].annotations)).toBe(true)
    })

    it('should handle unknown errors with generic message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockVariantService.searchVariants.mockRejectedValue('Unknown error type')

      const request = new NextRequest('http://localhost:3000/api/variants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(data.message).toBe('Unknown error')
      
      consoleErrorSpy.mockRestore()
    })
  })
})