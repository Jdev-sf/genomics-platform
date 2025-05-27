// __tests__/components/theme-provider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, ThemeToggle, useTheme } from '@/components/theme-provider'

// Test component to access theme context
const TestComponent = () => {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  it('provides default theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
  })

  it('allows theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByText('Set Dark'))
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    
    fireEvent.click(screen.getByText('Set Light'))
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
  })

  it('saves theme to localStorage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    
    render(
      <ThemeProvider storageKey="test-theme">
        <TestComponent />
      </ThemeProvider>
    )
    
    fireEvent.click(screen.getByText('Set Dark'))
    expect(setItemSpy).toHaveBeenCalledWith('test-theme', 'dark')
  })
})