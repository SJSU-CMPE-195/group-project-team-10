import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
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

describe('Roadmap add course', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('filters by subject and lists that subject in course number order', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { courseId: 102, courseCode: "CS 146", courseTitle: "Data Structures and Algorithms", units: 3, department: "CS" },
        { courseId: 101, courseCode: "CS 46A", courseTitle: "Introduction to Programming", units: 4, department: "CS" },
        { courseId: 103, courseCode: "BIOL 10", courseTitle: "The Living World", units: 3, department: "BIOL" },
      ]),
    }))

    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add Course' }))
    })

    const courseSelect = screen.getByLabelText('Course')
    expect(courseSelect.disabled).toBe(true)

    const optionValues = select => [...select.options].map(o => o.value).filter(Boolean)
    const subjects = optionValues(screen.getByLabelText('Subject'))
    // every sample-major course is already placed, so only the fetched subjects remain, in order
    expect(subjects).toEqual(['BIOL', 'CS'])

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'CS' } })

    // CS 46B is already on the sample roadmap, so it is not offered
    const courseOptions = [...courseSelect.options].filter(o => o.value).map(o => o.textContent)
    expect(courseOptions).toEqual([
      'CS 46A — Introduction to Programming',
      'CS 146 — Data Structures and Algorithms',
    ])
  })
})

describe('Roadmap arrow toggle', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('hides and shows all prerequisite arrows and remembers the choice', () => {
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    const toggle = screen.getByRole('button', { name: 'Hide Arrows' })
    expect(toggle.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(toggle)

    expect(toggle.textContent).toBe('Show Arrows')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(localStorage.getItem('coursePlanner.showRoadmapArrows')).toBe('false')
  })

  it('starts hidden when arrows were turned off before', () => {
    localStorage.setItem('coursePlanner.showRoadmapArrows', 'false')
    renderWithProviders(<Roadmap />, { route: '/roadmap' })
    expect(screen.getByRole('button', { name: 'Show Arrows' })).toBeDefined()
  })
})
