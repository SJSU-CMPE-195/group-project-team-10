import { screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import Catalog from './Catalog'

describe('Catalog', () => {
  it('renders the heading', () => {
    renderWithProviders(<Catalog />)
    expect(screen.getByRole('heading', { name: 'Course Catalog' })).toBeDefined()
  })

  it('renders the search input', () => {
    renderWithProviders(<Catalog />)
    expect(screen.getByPlaceholderText('Search courses...')).toBeDefined()
  })

  it('shows all courses by default', () => {
    renderWithProviders(<Catalog />)
    expect(screen.getByText(/Showing 32 of 32 courses/)).toBeDefined()
  })

  it('filters courses by search text', () => {
    renderWithProviders(<Catalog />)
    const input = screen.getByPlaceholderText('Search courses...')
    fireEvent.change(input, { target: { value: 'CMPE 120' } })
    expect(screen.getByText(/Showing 1 of 32/)).toBeDefined()
  })

  it('filters courses by department', () => {
    renderWithProviders(<Catalog />)
    const mathChip = screen.getByRole('button', { name: 'MATH' })
    fireEvent.click(mathChip)
    expect(screen.getByText(/Showing 5 of 32/)).toBeDefined()
  })

  it('renders the All filter chip', () => {
    renderWithProviders(<Catalog />)
    expect(screen.getByRole('button', { name: 'All' })).toBeDefined()
  })

  it('resets department filter when All is clicked', () => {
    renderWithProviders(<Catalog />)
    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))
    expect(screen.getByText(/Showing 5 of 32/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText(/Showing 32 of 32/)).toBeDefined()
  })

  it('renders course cards', () => {
    renderWithProviders(<Catalog />)
    expect(screen.getByText('CMPE 30')).toBeDefined()
    expect(screen.getByText('Programming Concepts and Methodology')).toBeDefined()
  })
})
