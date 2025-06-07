// __tests__/components/error-boundary.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '../utils/test-utils'
import { ErrorBoundary, ApiErrorBoundary, TableErrorBoundary, ChartErrorBoundary, useErrorHandler } from '@/components/error-boundaries/error-boundary'

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// Component to test useErrorHandler hook
const TestErrorHandler = () => {
  const { reportError } = useErrorHandler()
  
  const handleClick = () => {
    reportError(new Error('Manual error'), 'test context')
  }
  
  return <button onClick={handleClick}>Report Error</button>
}

describe('ErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Component Error')).toBeInTheDocument()
    expect(screen.getByText('This component failed to load properly.')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('can reset error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Component Error')).toBeInTheDocument()
    
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    
    // After retry, error should be reset but component still throws
    expect(screen.getByText('Component Error')).toBeInTheDocument()
  })

  it('uses custom fallback component', () => {
    const CustomFallback = ({ error }: { error: Error }) => (
      <div>Custom error: {error.message}</div>
    )
    
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument()
  })

  it('renders page-level error fallback', () => {
    render(
      <ErrorBoundary level="page" name="TestPage">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Page Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong with this page. Please try refreshing or contact support.')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })

  it('renders feature-level error fallback', () => {
    render(
      <ErrorBoundary level="feature" name="TestFeature">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Feature Unavailable')).toBeInTheDocument()
    expect(screen.getByText('This feature is temporarily unavailable due to an error.')).toBeInTheDocument()
  })

  it('displays error ID', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Error ID:/)).toBeInTheDocument()
  })

  it('shows error details in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary level="page">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })

  it('logs error information', () => {
    render(
      <ErrorBoundary name="TestBoundary" level="component">
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error Boundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })
})

describe('ApiErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders API-specific error message', () => {
    render(
      <ApiErrorBoundary>
        <ThrowError />
      </ApiErrorBoundary>
    )
    
    expect(screen.getByText('API Error')).toBeInTheDocument()
    expect(screen.getByText('Failed to load data from the server.')).toBeInTheDocument()
  })
})

describe('TableErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders table-specific error message', () => {
    render(
      <TableErrorBoundary>
        <ThrowError />
      </TableErrorBoundary>
    )
    
    expect(screen.getByText('Table Loading Error')).toBeInTheDocument()
    expect(screen.getByText('Unable to display table data.')).toBeInTheDocument()
  })
})

describe('ChartErrorBoundary', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders chart-specific error message', () => {
    render(
      <ChartErrorBoundary>
        <ThrowError />
      </ChartErrorBoundary>
    )
    
    expect(screen.getByText('Chart failed to render')).toBeInTheDocument()
  })
})

describe('useErrorHandler', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('reports errors with context', () => {
    render(<TestErrorHandler />)
    
    const button = screen.getByText('Report Error')
    fireEvent.click(button)
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error reported via useErrorHandler:',
      expect.objectContaining({
        message: 'Manual error',
        context: 'test context',
        timestamp: expect.any(String),
        url: expect.any(String),
      })
    )
  })
})