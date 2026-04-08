import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import Roadmap from './Roadmap'

describe('Roadmap', () => {
  it('renders the roadmap heading', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    expect(screen.getByRole('heading', { name: 'Roadmap' })).toBeDefined()
  })

  it('renders the back button', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    expect(screen.getByText(/Back/)).toBeDefined()
  })

  it('renders the save button as disabled initially', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    const saveBtn = screen.getByText('Save Changes')
    expect(saveBtn.disabled).toBe(true)
  })

  it('renders the add gap semester button', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    expect(screen.getByText('Add Gap Semester')).toBeDefined()
  })

  it('renders the mark as failed dropdown', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    expect(screen.getByText('Mark as Failed...')).toBeDefined()
  })

  it('renders the fail button as disabled when no course selected', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    const failBtn = screen.getByText('Fail')
    expect(failBtn.disabled).toBe(true)
  })
})
