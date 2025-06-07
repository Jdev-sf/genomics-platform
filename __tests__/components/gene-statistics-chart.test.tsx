// __tests__/components/gene-statistics-chart.test.tsx
import { render, screen, fireEvent } from '../utils/test-utils'
import { GeneStatisticsChart } from '@/components/charts/gene-statistics-chart'

const mockStatistics = {
  chromosomeDistribution: [
    { chromosome: '1', count: 100, pathogenic: 20 },
    { chromosome: '2', count: 80, pathogenic: 15 },
    { chromosome: 'X', count: 60, pathogenic: 10 },
  ],
  biotypeDistribution: [
    { biotype: 'protein_coding', count: 200, percentage: 80 },
    { biotype: 'lncRNA', count: 30, percentage: 12 },
    { biotype: 'miRNA', count: 20, percentage: 8 },
  ],
  variantCounts: [
    { geneSymbol: 'BRCA1', totalVariants: 1500, pathogenicVariants: 300, chromosome: '17' },
    { geneSymbol: 'BRCA2', totalVariants: 1200, pathogenicVariants: 250, chromosome: '13' },
    { geneSymbol: 'TP53', totalVariants: 2000, pathogenicVariants: 500, chromosome: '17' },
  ],
  clinicalSignificance: [
    { significance: 'Pathogenic', count: 1050, percentage: 35 },
    { significance: 'Benign', count: 1500, percentage: 50 },
    { significance: 'Uncertain significance', count: 450, percentage: 15 },
  ],
  trends: [
    { date: '2024-01', newGenes: 50, newVariants: 500 },
    { date: '2024-02', newGenes: 60, newVariants: 600 },
    { date: '2024-03', newGenes: 55, newVariants: 550 },
  ],
}

// Mock recharts components to avoid canvas issues in tests
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
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
}))

describe('GeneStatisticsChart', () => {
  it('renders loading state', () => {
    render(<GeneStatisticsChart statistics={null} loading={true} />)
    
    expect(screen.getByText('Loading gene statistics...')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<GeneStatisticsChart statistics={null} loading={false} error="Failed to load" />)
    
    expect(screen.getByText('Error loading statistics')).toBeInTheDocument()
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<GeneStatisticsChart statistics={null} loading={false} />)
    
    expect(screen.getByText('No statistics available')).toBeInTheDocument()
  })

  it('renders all tab sections with data', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    expect(screen.getByText('Chromosome Distribution')).toBeInTheDocument()
    expect(screen.getByText('Biotype Distribution')).toBeInTheDocument()
    expect(screen.getByText('Top Genes')).toBeInTheDocument()
    expect(screen.getByText('Clinical Significance')).toBeInTheDocument()
    expect(screen.getByText('Trends')).toBeInTheDocument()
  })

  it('displays chromosome distribution chart', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    // Check for bar chart elements
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('bar')).toHaveLength(2) // Total and Pathogenic bars
  })

  it('displays biotype distribution pie chart', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Biotype Distribution'))
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
  })

  it('displays top genes scatter plot', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Top Genes'))
    
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
    expect(screen.getByTestId('scatter')).toBeInTheDocument()
  })

  it('displays clinical significance pie chart', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Clinical Significance'))
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('displays trends line chart', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Trends'))
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('line')).toHaveLength(2) // New genes and variants lines
  })

  it('shows summary statistics', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    // Should display total counts somewhere in the summary
    expect(screen.getByText(/Total Genes/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument() // 3 chromosomes in distribution
  })

  it('allows tab navigation', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    const biotypeTab = screen.getByText('Biotype Distribution')
    fireEvent.click(biotypeTab)
    
    // Should switch to biotype view
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    
    const chromosomeTab = screen.getByText('Chromosome Distribution')
    fireEvent.click(chromosomeTab)
    
    // Should switch back to chromosome view
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('displays data labels correctly', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    // Check for gene symbols in top genes tab
    fireEvent.click(screen.getByText('Top Genes'))
    
    expect(screen.getByText('BRCA1')).toBeInTheDocument()
    expect(screen.getByText('BRCA2')).toBeInTheDocument()
    expect(screen.getByText('TP53')).toBeInTheDocument()
  })

  it('shows percentage values in distribution charts', () => {
    render(<GeneStatisticsChart statistics={mockStatistics} loading={false} />)
    
    fireEvent.click(screen.getByText('Biotype Distribution'))
    
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('8%')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    const { container } = render(
      <GeneStatisticsChart 
        statistics={mockStatistics} 
        loading={false} 
        className="custom-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})