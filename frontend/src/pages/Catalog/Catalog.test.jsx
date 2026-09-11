import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import Catalog from './Catalog'

const termsResponse = ['Spring 2026', 'Fall 2026']

const springCoursesResponse = [
  {
    courseId: 1,
    courseCode: 'CMPE 195A',
    courseTitle: 'Senior Design Project I',
    description: 'Capstone planning and design.',
    units: 3,
    department: 'CMPE',
    offeringCount: 2,
    availableTerms: ['Spring 2026', 'Fall 2026'],
  },
  {
    courseId: 2,
    courseCode: 'MATH 42',
    courseTitle: 'Discrete Mathematics',
    description: 'Logic, proof techniques, and combinatorics.',
    units: 3,
    department: 'MATH',
    offeringCount: 1,
    availableTerms: ['Spring 2026'],
  },
]

describe('Catalog', () => {
  // tests pick a term like a user would
  async function renderAndPickTerm(term = 'Spring 2026') {
    const result = renderWithProviders(<Catalog />)

    const picker = await screen.findByLabelText('Semester')
    await waitFor(() => {
      expect(within(picker).getByRole('option', { name: term })).toBeDefined()
    })
    fireEvent.change(picker, { target: { value: term } })

    return result
  }
  beforeEach(() => {
    globalThis.fetch = vi.fn(url => {
      if (url === '/api/catalog/terms') {
        return Promise.resolve({
          ok: true,
          json: async () => termsResponse,
        })
      }

      if (url === '/api/catalog/courses?term=Spring%202026') {
        return Promise.resolve({
          ok: true,
          json: async () => springCoursesResponse,
        })
      }

      if (url === '/api/sections?term=Spring%202026') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        })
      }

      return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prompts for a semester before loading anything', async () => {
    renderWithProviders(<Catalog />)

    expect(await screen.findByText('Choose a semester to browse courses.')).toBeDefined()
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/catalog/courses')
    )
  })

  it('loads catalog courses once a term is chosen', async () => {
    await renderAndPickTerm()

    expect(await screen.findByText(/Showing 2 of 2 courses/)).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
    expect(screen.getByText('Senior Design Project I')).toBeDefined()
    expect(screen.getByDisplayValue('Spring 2026')).toBeDefined()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/catalog/courses?term=Spring%202026')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/sections?term=Spring%202026')
  })

  it('filters backend-loaded courses by search text', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: '195A' },
    })

    expect(screen.getByText(/Showing 1 of 2 courses/)).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
  })

  it('filters backend-loaded courses by department', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))

    expect(screen.getByText(/Showing 1 of 2 courses/)).toBeDefined()
    expect(screen.getByText('MATH 42')).toBeDefined()
  })

  // terms request lives in ScheduleContext, so failure is
  // covered by ScheduleContext.test.jsx
  it('reports an error when courses fail to load for a term', async () => {
    await renderAndPickTerm()

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
    )

    fireEvent.change(await screen.findByLabelText('Semester'), {
      target: { value: 'Fall 2026' },
    })

    expect(await screen.findByText(/Failed to load/)).toBeDefined()
  })
})