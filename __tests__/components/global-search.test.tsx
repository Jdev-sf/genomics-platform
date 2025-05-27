// __tests__/components/global-search.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalSearch } from '@/components/global-search'

// Mock the custom hooks
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}))

jest.mock('@/hooks/use-intersection-observer', () => ({
  useIntersectionObserver: () => ({
    ref: { current: null },
    isVisible: true,
  }),
}))

describe('GlobalSearch', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: {
            query: 'BRCA1',
            total: 1,
            results: {
              genes: [{
                id: '1',
                symbol: 'BRCA1',
                name: 'Breast cancer type 1',
                chromosome: '17',
                variant_count: 100,
                type: 'gene'
              }],
              variants: []
            }
          }
        }),
      })
    ) as jest.Mock
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders search button', () => {
    render(<GlobalSearch />)
    expect(screen.getByText('Search...')).toBeInTheDocument()
  })

  it('opens search modal when clicked', () => {
    render(<GlobalSearch />)
    const searchButton = screen.getByText('Search...')
    fireEvent.click(searchButton)
    
    expect(screen.getByPlaceholderText('Search genes, variants...')).toBeInTheDocument()
  })

  it('performs search when typing', async () => {
    render(<GlobalSearch />)
    const searchButton = screen.getByText('Search...')
    fireEvent.click(searchButton)
    
    const searchInput = screen.getByPlaceholderText('Search genes, variants...')
    fireEvent.change(searchInput, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?query=BRCA1')
      )
    })
  })

  it('displays search results', async () => {
    render(<GlobalSearch />)
    const searchButton = screen.getByText('Search...')
    fireEvent.click(searchButton)
    
    const searchInput = screen.getByPlaceholderText('Search genes, variants...')
    fireEvent.change(searchInput, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
      expect(screen.getByText('Breast cancer type 1')).toBeInTheDocument()
    })
  })

  it('closes modal when clicking X', () => {
    render(<GlobalSearch />)
    const searchButton = screen.getByText('Search...')
    fireEvent.click(searchButton)
    
    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    
    expect(screen.queryByPlaceholderText('Search genes, variants...')).not.toBeInTheDocument()
  })
})