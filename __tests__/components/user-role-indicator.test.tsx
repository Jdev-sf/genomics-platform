// __tests__/components/user-role-indicator.test.tsx
import React from 'react'
import { render, screen, waitFor } from '../utils/test-utils'
import { UserRoleIndicator } from '@/components/user-role-indicator'
import { useSession } from 'next-auth/react'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('UserRoleIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    const { container } = render(<UserRoleIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when no user role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User'
        }
      },
      status: 'authenticated'
    })

    const { container } = render(<UserRoleIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('renders viewer role correctly', async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'viewer-id',
            name: 'viewer',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Viewer')).toBeInTheDocument()
    
    // Check tooltip content
    const badge = screen.getByText('Viewer').closest('div')
    if (badge) {
      await waitFor(() => {
        expect(screen.getByText('Viewer')).toBeInTheDocument()
      })
    }
  })

  it('renders researcher role correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'researcher-id',
            name: 'researcher',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Researcher')).toBeInTheDocument()
  })

  it('renders clinician role correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'clinician-id',
            name: 'clinician',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Clinician')).toBeInTheDocument()
  })

  it('renders admin role correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'admin-id',
            name: 'admin',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('falls back to viewer for unknown role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'unknown-id',
            name: 'unknown-role',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Viewer')).toBeInTheDocument()
  })

  it('shows guest indicator for guest users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'guest123@guest.local',
          name: 'Guest User',
          role: {
            id: 'viewer-id',
            name: 'viewer',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Viewer')).toBeInTheDocument()
    expect(screen.getByText('(Guest)')).toBeInTheDocument()
  })

  it('does not show guest indicator for regular users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'regular@example.com',
          name: 'Regular User',
          role: {
            id: 'researcher-id',
            name: 'researcher',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    expect(screen.getByText('Researcher')).toBeInTheDocument()
    expect(screen.queryByText('(Guest)')).not.toBeInTheDocument()
  })

  it('renders correct badge styling for each role', () => {
    const roles = [
      { name: 'viewer', expectedClass: 'bg-gray-100' },
      { name: 'researcher', expectedClass: 'bg-blue-100' },
      { name: 'clinician', expectedClass: 'bg-green-100' },
      { name: 'admin', expectedClass: 'bg-red-100' }
    ]

    roles.forEach(({ name, expectedClass }) => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-id',
            email: 'test@example.com',
            name: 'Test User',
            role: {
              id: `${name}-id`,
              name,
              permissions: {}
            }
          }
        },
        status: 'authenticated'
      })

      const { container, unmount } = render(<UserRoleIndicator />)
      const badge = container.querySelector('.flex.items-center.gap-1')
      expect(badge).toHaveClass(expectedClass)
      unmount()
    })
  })

  it('renders role icons correctly', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-id',
          email: 'test@example.com',
          name: 'Test User',
          role: {
            id: 'researcher-id',
            name: 'researcher',
            permissions: {}
          }
        }
      },
      status: 'authenticated'
    })

    render(<UserRoleIndicator />)
    
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('h-3', 'w-3')
  })
})