// __tests__/components/lazy-table.test.tsx
import React from 'react'
import { render, screen } from '../utils/test-utils'
import { LazyTable } from '@/components/lazy-table'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'

// Mock the intersection observer hook
jest.mock('@/hooks/use-intersection-observer')
const mockUseIntersectionObserver = useIntersectionObserver as jest.MockedFunction<typeof useIntersectionObserver>

describe('LazyTable', () => {
  const mockRef = { current: null }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state when not visible', () => {
    mockUseIntersectionObserver.mockReturnValue({
      ref: mockRef,
      isVisible: false
    })

    render(
      <LazyTable>
        <div>Table content</div>
      </LazyTable>
    )

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    expect(screen.queryByText('Table content')).not.toBeInTheDocument()
  })

  it('renders children when visible', () => {
    mockUseIntersectionObserver.mockReturnValue({
      ref: mockRef,
      isVisible: true
    })

    render(
      <LazyTable>
        <div>Table content</div>
      </LazyTable>
    )

    expect(screen.getByText('Table content')).toBeInTheDocument()
    expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
  })

  it('passes correct options to intersection observer hook', () => {
    mockUseIntersectionObserver.mockReturnValue({
      ref: mockRef,
      isVisible: false
    })

    render(
      <LazyTable>
        <div>Content</div>
      </LazyTable>
    )

    expect(mockUseIntersectionObserver).toHaveBeenCalledWith({
      threshold: 0.1,
      freezeOnceVisible: true
    })
  })

  it('has minimum height for layout stability', () => {
    mockUseIntersectionObserver.mockReturnValue({
      ref: mockRef,
      isVisible: false
    })

    const { container } = render(
      <LazyTable>
        <div>Content</div>
      </LazyTable>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('min-h-[200px]')
  })

  it('renders complex children when visible', () => {
    mockUseIntersectionObserver.mockReturnValue({
      ref: mockRef,
      isVisible: true
    })

    render(
      <LazyTable>
        <table>
          <thead>
            <tr>
              <th>Gene Symbol</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>BRCA1</td>
              <td>43044295</td>
            </tr>
          </tbody>
        </table>
      </LazyTable>
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Gene Symbol')).toBeInTheDocument()
    expect(screen.getByText('BRCA1')).toBeInTheDocument()
  })

  it('maintains ref for intersection observer', () => {
    const testRef = { current: document.createElement('div') }
    mockUseIntersectionObserver.mockReturnValue({
      ref: testRef,
      isVisible: true
    })

    const { container } = render(
      <LazyTable>
        <div>Content</div>
      </LazyTable>
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toBeDefined()
  })
})