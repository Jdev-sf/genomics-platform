// __tests__/components/variant-statistics-chart.test.tsx
import { render, screen, fireEvent } from '../utils/test-utils'
import { VariantStatisticsChart } from '@/components/charts/variant-statistics-chart'

const mockVariantStatistics = {
  chromosomeDistribution: [
    { chromosome: '1', count: 500, pathogenic: 100 },
    { chromosome: '17', count: 800, pathogenic: 200 },
    { chromosome: 'X', count: 300, pathogenic: 50 },
  ],
  consequenceDistribution: [
    { consequence: 'missense_variant', count: 1200, percentage: 60 },
    { consequence: 'synonymous_variant', count: 400, percentage: 20 },
    { consequence: 'nonsense_variant', count: 200, percentage: 10 },
    { consequence: 'frameshift_variant', count: 200, percentage: 10 },
  ],
  clinicalSignificance: [
    { significance: 'Pathogenic', count: 350, percentage: 17.5 },
    { significance: 'Likely pathogenic', count: 150, percentage: 7.5 },
    { significance: 'Uncertain significance', count: 800, percentage: 40 },
    { significance: 'Likely benign', count: 300, percentage: 15 },
    { significance: 'Benign', count: 400, percentage: 20 },
  ],
  alleleFrequencyDistribution: [
    { range: '0-0.001', count: 1500, percentage: 75 },
    { range: '0.001-0.01', count: 300, percentage: 15 },
    { range: '0.01-0.1', count: 150, percentage: 7.5 },
    { range: '>0.1', count: 50, percentage: 2.5 },
  ],
  trends: [
    { date: '2024-01', newVariants: 200, pathogenicVariants: 50 },
    { date: '2024-02', newVariants: 250, pathogenicVariants: 60 },
    { date: '2024-03', newVariants: 220, pathogenicVariants: 55 },
  ],
}

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Legend: () => <div data-testid="legend" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
}))

describe('VariantStatisticsChart', () => {
  it('renders loading state', () => {
    render(<VariantStatisticsChart statistics={null} loading={true} />)
    
    expect(screen.getByText('Loading variant statistics...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<VariantStatisticsChart statistics={null} loading={false} error="Failed to load" />)
    
    expect(screen.getByText('Error loading statistics')).toBeInTheDocument()
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<VariantStatisticsChart statistics={null} loading={false} />)
    
    expect(screen.getByText('No statistics available')).toBeInTheDocument()
  })

  it('renders all tab sections with data', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    expect(screen.getByText('Chromosome Distribution')).toBeInTheDocument()
    expect(screen.getByText('Consequence Types')).toBeInTheDocument()
    expect(screen.getByText('Clinical Significance')).toBeInTheDocument()
    expect(screen.getByText('Allele Frequency')).toBeInTheDocument()
    expect(screen.getByText('Trends')).toBeInTheDocument()
  })

  it('displays chromosome distribution chart', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar')).toHaveLength(2) // Total and Pathogenic bars
  })

  it('displays consequence types pie chart', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Consequence Types'))
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
  })

  it('displays clinical significance distribution', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Clinical Significance'))
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('displays allele frequency distribution', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Allele Frequency'))
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('displays trends chart', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Trends'))
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('line')).toHaveLength(2) // New variants and pathogenic variants lines
  })

  it('shows summary statistics', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    // Should display total counts in summary
    expect(screen.getByText(/Total Variants/)).toBeInTheDocument()
    expect(screen.getByText(/Pathogenic Rate/)).toBeInTheDocument()
  })

  it('displays consequence type labels', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Consequence Types'))
    
    expect(screen.getByText('missense_variant')).toBeInTheDocument()
    expect(screen.getByText('synonymous_variant')).toBeInTheDocument()
    expect(screen.getByText('nonsense_variant')).toBeInTheDocument()
    expect(screen.getByText('frameshift_variant')).toBeInTheDocument()
  })

  it('displays clinical significance labels', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Clinical Significance'))
    
    expect(screen.getByText('Pathogenic')).toBeInTheDocument()
    expect(screen.getByText('Likely pathogenic')).toBeInTheDocument()
    expect(screen.getByText('Uncertain significance')).toBeInTheDocument()
    expect(screen.getByText('Likely benign')).toBeInTheDocument()
    expect(screen.getByText('Benign')).toBeInTheDocument()
  })

  it('displays allele frequency ranges', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Allele Frequency'))
    
    expect(screen.getByText('0-0.001')).toBeInTheDocument()
    expect(screen.getByText('0.001-0.01')).toBeInTheDocument()
    expect(screen.getByText('0.01-0.1')).toBeInTheDocument()
    expect(screen.getByText('>0.1')).toBeInTheDocument()
  })

  it('shows percentage values correctly', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Consequence Types'))
    
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('allows tab navigation between different views', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    // Start with chromosome distribution (default)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    
    // Switch to consequence types
    fireEvent.click(screen.getByText('Consequence Types'))
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    
    // Switch to trends
    fireEvent.click(screen.getByText('Trends'))
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    
    // Switch back to chromosome distribution
    fireEvent.click(screen.getByText('Chromosome Distribution'))
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    const { container } = render(
      <VariantStatisticsChart 
        statistics={mockVariantStatistics} 
        loading={false} 
        className="custom-variant-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-variant-class')
  })

  it('calculates and displays pathogenic rate', () => {
    render(<VariantStatisticsChart statistics={mockVariantStatistics} loading={false} />)
    
    // Total pathogenic + likely pathogenic = 350 + 150 = 500
    // Total variants = 2000, so pathogenic rate = 25%
    expect(screen.getByText(/25%/)).toBeInTheDocument()
  })

  it('handles empty consequence data gracefully', () => {
    const emptyStats = {
      ...mockVariantStatistics,
      consequenceDistribution: [],
    }
    
    render(<VariantStatisticsChart statistics={emptyStats} loading={false} />)
    
    fireEvent.click(screen.getByText('Consequence Types'))
    
    expect(screen.getByText('No consequence data available')).toBeInTheDocument()
  })
})