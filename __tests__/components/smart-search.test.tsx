// __tests__/components/smart-search.test.tsx
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { SmartSearch } from '@/components/smart-search'
import { mockApiResponses } from '../utils/mocks/api-responses'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

describe('SmartSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders search input with placeholder', () => {
    render(<SmartSearch />)
    expect(screen.getByPlaceholderText('Search genes, variants...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<SmartSearch placeholder="Custom search..." />)
    expect(screen.getByPlaceholderText('Custom search...')).toBeInTheDocument()
  })

  it('opens suggestions dropdown on focus', async () => {
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    
    await waitFor(() => {
      expect(screen.getByText('Start typing to search for genes or variants...')).toBeInTheDocument()
    })
  })

  it('performs search when typing', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?query=BRCA1&limit=8')
      )
    })
  })

  it('displays search results for genes', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
      expect(screen.getByText('Breast cancer type 1 susceptibility protein')).toBeInTheDocument()
      expect(screen.getByText('Chr 17 • 1247 variants')).toBeInTheDocument()
    })
  })

  it('displays search results for variants', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'rs80357382' } })
    
    await waitFor(() => {
      expect(screen.getByText('rs80357382')).toBeInTheDocument()
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
      expect(screen.getByText('Position 43045677')).toBeInTheDocument()
    })
  })

  it('shows loading state during search', async () => {
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockApiResponses.search()), 100))
    )
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    expect(screen.getByText('Searching...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
    })
  })

  it('navigates to gene page when gene suggestion is selected', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('BRCA1'))
    
    expect(mockPush).toHaveBeenCalledWith('/genes/gene-1')
  })

  it('navigates to variant page when variant suggestion is selected', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'rs80357382' } })
    
    await waitFor(() => {
      expect(screen.getByText('rs80357382')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('rs80357382'))
    
    expect(mockPush).toHaveBeenCalledWith('/variants/variant-1')
  })

  it('supports keyboard navigation', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
    })
    
    // Arrow down to select first result
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(mockPush).toHaveBeenCalledWith('/genes/gene-1')
  })

  it('closes dropdown on escape key', async () => {
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    
    await waitFor(() => {
      expect(screen.getByText('Start typing to search for genes or variants...')).toBeInTheDocument()
    })
    
    fireEvent.keyDown(input, { key: 'Escape' })
    
    await waitFor(() => {
      expect(screen.queryByText('Start typing to search for genes or variants...')).not.toBeInTheDocument()
    })
  })

  it('displays recent searches when available', () => {
    const mockGetItem = jest.fn().mockReturnValue(JSON.stringify(['BRCA1', 'TP53']))
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: mockGetItem, setItem: jest.fn(), removeItem: jest.fn() },
    })
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    
    expect(screen.getByText('Recent Searches')).toBeInTheDocument()
    expect(screen.getByText('BRCA1')).toBeInTheDocument()
    expect(screen.getByText('TP53')).toBeInTheDocument()
  })

  it('adds searches to recent searches', async () => {
    const mockSetItem = jest.fn()
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn().mockReturnValue(null), setItem: mockSetItem, removeItem: jest.fn() },
    })
    
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('BRCA1'))
    
    expect(mockSetItem).toHaveBeenCalledWith(
      'genomics-recent-searches',
      JSON.stringify(['BRCA1'])
    )
  })

  it('calls custom onSelect handler when provided', async () => {
    const mockOnSelect = jest.fn()
    global.fetch = jest.fn().mockResolvedValue(mockApiResponses.search())
    
    render(<SmartSearch onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('BRCA1'))
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'gene-gene-1',
        type: 'gene',
        title: 'BRCA1',
      })
    )
  })

  it('handles search errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
    
    render(<SmartSearch />)
    const input = screen.getByPlaceholderText('Search genes, variants...')
    
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'BRCA1' } })
    
    await waitFor(() => {
      expect(screen.queryByText('BRCA1')).not.toBeInTheDocument()
    })
  })
})