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

// 30 courses so the 25 limit has something to split
const fallCoursesResponse = Array.from({ length: 30 }, (_, i) => ({
  courseId: 100 + i,
  courseCode: `AAS ${i + 1}`,
  courseTitle: `Asian American Studies ${i + 1}`,
  description: 'Survey course.',
  units: 3,
  department: 'AAS',
  offeringCount: 1,
  availableTerms: ['Fall 2026'],
}))

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

      if (url === '/api/catalog/courses?term=Fall%202026') {
        return Promise.resolve({
          ok: true,
          json: async () => fallCoursesResponse,
        })
      }

      if (url === '/api/sections?term=Fall%202026') {
        return Promise.resolve({
          ok: true,
          json: async () => [],
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

    expect(screen.getByText(/Showing 1 of 1 courses/)).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
  })

  it('keeps the subject list behind the filters toggle', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    // resting state: just the All marker, no wall of subject codes
    expect(screen.getByText('All')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'MATH' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.getByRole('button', { name: 'MATH' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'CMPE' })).toBeDefined()
  })

  it('narrows the subject list with the subject search', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.change(screen.getByLabelText('Search subjects'), {
      target: { value: 'mat' },
    })

    expect(screen.getByRole('button', { name: 'MATH' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'CMPE' })).toBeNull()

    // narrowing the list must not narrow the results on its own
    expect(screen.getByText(/Showing 2 of 2 courses/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))
    expect(screen.getByText(/Showing 1 of 1 courses/)).toBeDefined()
  })

  it('says so when no subject matches the subject search', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.change(screen.getByLabelText('Search subjects'), {
      target: { value: 'zzz' },
    })

    expect(screen.getByText(/No subjects match "zzz"/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'MATH' })).toBeNull()
  })

  it('drops the subject search when the panel is closed', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.change(screen.getByLabelText('Search subjects'), {
      target: { value: 'mat' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))

    expect(screen.getByLabelText('Search subjects').value).toBe('')
    expect(screen.getByRole('button', { name: 'CMPE' })).toBeDefined()
  })

  it('filters backend-loaded courses by department', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))

    expect(screen.getByText(/Showing 1 of 1 courses/)).toBeDefined()
    expect(screen.getByText('MATH 42')).toBeDefined()
    expect(screen.queryByText('CMPE 195A')).toBeNull()
  })

  it('selects several departments at once', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))
    expect(screen.getByText(/Showing 1 of 1 courses/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'CMPE' }))

    expect(screen.getByText(/Showing 2 of 2 courses/)).toBeDefined()
    expect(screen.getByText('MATH 42')).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove MATH filter' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Remove CMPE filter' })).toBeDefined()
  })

  it('clears every department filter at once', async () => {
    await renderAndPickTerm()

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))
    expect(screen.getByText(/Showing 1 of 1 courses/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(screen.getByText(/Showing 2 of 2 courses/)).toBeDefined()
    expect(screen.getByText('All')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('shows at most 25 courses per page and pages through the rest', async () => {
    await renderAndPickTerm('Fall 2026')

    expect(await screen.findByText(/Showing 1–25 of 30 courses/)).toBeDefined()
    expect(screen.getAllByText(/^AAS \d+$/)).toHaveLength(25)
    expect(screen.getByText('AAS 1')).toBeDefined()
    expect(screen.queryByText('AAS 26')).toBeNull()
    expect(screen.getByText('Page 1 of 2')).toBeDefined()

    const prev = screen.getByRole('button', { name: /Prev/ })
    expect(prev.disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Next/ }))

    expect(screen.getByText(/Showing 26–30 of 30 courses/)).toBeDefined()
    expect(screen.getAllByText(/^AAS \d+$/)).toHaveLength(5)
    expect(screen.getByText('AAS 26')).toBeDefined()
    expect(screen.queryByText('AAS 1')).toBeNull()
    expect(screen.getByText('Page 2 of 2')).toBeDefined()
    expect(screen.getByRole('button', { name: /Next/ }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /Prev/ }))
    expect(screen.getByText('Page 1 of 2')).toBeDefined()
  })

  it('returns to the first page when the search changes', async () => {
    await renderAndPickTerm('Fall 2026')

    await screen.findByText('Page 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(screen.getByText('Page 2 of 2')).toBeDefined()

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: 'AAS 1' },
    })

    expect(screen.getByText('AAS 1')).toBeDefined()
    expect(screen.queryByText(/Page 2 of/)).toBeNull()
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