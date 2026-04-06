import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { renderWithProviders } from './test-utils'

describe('App', () => {
  it('renders the dashboard at root route', () => {
    renderWithProviders(<App />, { route: '/' })
    expect(screen.getByRole('heading', { name: 'Course Planner Plus', level: 1 })).toBeDefined()
  })

  it('renders the roadmap page', () => {
    renderWithProviders(<App />, { route: '/roadmap' })
    expect(screen.getByRole('heading', { name: 'Roadmap' })).toBeDefined()
  })

  it('renders the catalog page', () => {
    renderWithProviders(<App />, { route: '/catalog' })
    expect(screen.getByRole('heading', { name: 'Course Catalog' })).toBeDefined()
  })

  it('renders navigation links', () => {
    renderWithProviders(<App />, { route: '/' })
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Roadmap' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Catalog' })).toBeDefined()
  })
})
