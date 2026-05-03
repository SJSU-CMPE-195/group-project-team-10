import { fireEvent, screen, waitFor } from '@testing-library/react'
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

      return Promise.reject(new Error(`Unhandled fetch request: ${url}`))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads catalog terms and courses from the backend', async () => {
    renderWithProviders(<Catalog />)

    expect(await screen.findByText(/Showing 2 of 2 courses/)).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
    expect(screen.getByText('Senior Design Project I')).toBeDefined()
    expect(screen.getByDisplayValue('Spring 2026')).toBeDefined()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/catalog/terms')
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/catalog/courses?term=Spring%202026')
  })

  it('filters backend-loaded courses by search text', async () => {
    renderWithProviders(<Catalog />)

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: '195A' },
    })

    expect(screen.getByText(/Showing 1 of 2 courses/)).toBeDefined()
    expect(screen.getByText('CMPE 195A')).toBeDefined()
  })

  it('filters backend-loaded courses by department', async () => {
    renderWithProviders(<Catalog />)

    await screen.findByText(/Showing 2 of 2 courses/)

    fireEvent.click(screen.getByRole('button', { name: 'MATH' }))

    expect(screen.getByText(/Showing 1 of 2 courses/)).toBeDefined()
    expect(screen.getByText('MATH 42')).toBeDefined()
  })

  it('shows an error when catalog terms fail to load', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    )

    renderWithProviders(<Catalog />)

    expect(await screen.findByText('Failed to load catalog terms (500)')).toBeDefined()

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
