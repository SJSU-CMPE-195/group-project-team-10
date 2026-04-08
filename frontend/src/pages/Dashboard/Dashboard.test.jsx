import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders the heading', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByRole('heading', { name: 'Course Planner Plus', level: 1 })).toBeDefined()
  })

  it('renders the major name', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByText('Computer Engineering, BS')).toBeDefined()
  })

  it('renders degree progress section', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByText('Degree Progress')).toBeDefined()
  })

  it('renders requirement categories', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByText('Lower Division Core')).toBeDefined()
    expect(screen.getByText('Upper Division Core')).toBeDefined()
    expect(screen.getByText('Math & Science')).toBeDefined()
    expect(screen.getByText('Senior Design')).toBeDefined()
    expect(screen.getByText('General Education')).toBeDefined()
  })

  it('renders action buttons', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByRole('link', { name: 'View Roadmap' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Browse Catalog' })).toBeDefined()
  })

  it('links to correct routes', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getByRole('link', { name: 'View Roadmap' }).getAttribute('href')).toBe('/roadmap')
    expect(screen.getByRole('link', { name: 'Browse Catalog' }).getAttribute('href')).toBe('/catalog')
  })
})
