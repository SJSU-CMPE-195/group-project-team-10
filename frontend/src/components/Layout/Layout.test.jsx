import { screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../../App'
import { renderWithProviders } from '../../test-utils'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    authLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}))

describe('Layout', () => {
  it('renders the brand link', () => {
    renderWithProviders(<App />)
    const brandLinks = screen.getAllByText('Course Planner Plus')
    expect(brandLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders navigation links', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Roadmap' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Catalog' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Login' })).toBeDefined()
  })

  it('has correct href on nav links', () => {
    renderWithProviders(<App />)

    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: 'Roadmap' }).getAttribute('href')).toBe('/roadmap')
    expect(screen.getByRole('link', { name: 'Catalog' }).getAttribute('href')).toBe('/catalog')
    expect(screen.getByRole('link', { name: 'Login' }).getAttribute('href')).toBe('/login')
  })
})