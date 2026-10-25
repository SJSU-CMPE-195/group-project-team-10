import { fireEvent, screen } from '@testing-library/react'
import { act, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { buildTestRoadmapState, renderWithProviders } from '../../test-utils'
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

  it('prompts guests to log in without saving their local roadmap', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })

    fireEvent.change(screen.getAllByLabelText('Course status')[0], {
      target: { value: 'completed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText(/create an account or log in to save this roadmap across devices/i)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Log In' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Create Account' })).toBeDefined()
  })
})

describe('Roadmap leave guard', () => {
  function renderDirty() {
    return renderWithProviders(<Roadmap />, {
      route: '/roadmap',
      roadmapState: { ...buildTestRoadmapState(), hasUnsavedChanges: true },
    })
  }

  it('leaves without a prompt when there are no unsaved changes', async () => {
    const { router } = renderWithProviders(<Roadmap />, { route: '/roadmap' })

    await act(() => router.navigate('/catalog'))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/catalog')
  })

  it('asks before leaving with unsaved changes and stays on Stay', async () => {
    const { router } = renderDirty()

    await act(() => router.navigate('/catalog'))
    expect(screen.getByRole('dialog', { name: 'Unsaved roadmap changes' })).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/roadmap')
  })

  it('leaves on Discard and leave', async () => {
    const { router } = renderDirty()

    await act(() => router.navigate('/catalog'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))
    })

    expect(router.state.location.pathname).toBe('/catalog')
  })

  it('shows no Save button or prompt in the autosave variant', async () => {
    const { router } = renderWithProviders(<Roadmap />, { route: '/roadmap', variant: 'autosave' })

    expect(screen.queryByText('Save Changes')).toBeNull()
    expect(screen.queryByText('Cancel Changes')).toBeNull()

    fireEvent.click(screen.getByText('Add Gap Semester'))
    await act(() => router.navigate('/catalog'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/catalog')
  })

  it('routes the Back button through the same prompt', async () => {
    renderDirty()

    await act(async () => {
      fireEvent.click(screen.getByText(/Back/))
    })

    expect(screen.getByRole('dialog', { name: 'Unsaved roadmap changes' })).toBeDefined()
  })
})
