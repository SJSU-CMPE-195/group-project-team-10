import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from '../../App'
import { renderWithProviders } from '../../test-utils'

vi.mock('../../context/useAuth', () => ({
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

  it('starts with the mobile drawer closed', () => {
    renderWithProviders(<App />)

    const toggle = screen.getByRole('button', { name: 'Menu' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('nav-drawer').dataset.open).toBe('false')
  })

  it('toggles the mobile drawer open and closed', () => {
    renderWithProviders(<App />)

    const toggle = screen.getByRole('button', { name: 'Menu' })
    const drawer = document.getElementById('nav-drawer')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(drawer.dataset.open).toBe('true')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(drawer.dataset.open).toBe('false')
  })

  it('closes the drawer when a nav link is followed', () => {
    renderWithProviders(<App />)

    const toggle = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('link', { name: 'Catalog' }))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the drawer on Escape', () => {
    renderWithProviders(<App />)

    const toggle = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })
})