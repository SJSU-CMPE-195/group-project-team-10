import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { buildTestRoadmapState, renderWithProviders } from '../../test-utils'
import Dashboard from './Dashboard'

vi.mock('../../api/catalog', () => ({
  fetchCatalogCourses: vi.fn(),
  fetchCatalogTerms: () => new Promise(() => {}),
}))
import { fetchCatalogCourses } from '../../api/catalog'

beforeEach(() => {
  fetchCatalogCourses.mockReset()
  fetchCatalogCourses.mockReturnValue(new Promise(() => {}))
})

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

function renderGeProgress() {
  const state = buildTestRoadmapState()
  state.courses = []
  state.prerequisites = []
  state.semesters = [{ semesterId: 1, term: 'Fall 2026', courses: [
    { courseId: 901, status: 'completed' },
    { courseId: 902, status: 'planned' },
    { courseId: 903, status: 'in_progress' },
    { courseId: 904, status: 'failed' },
    { courseId: 905, status: 'blocked' },
    { courseId: 906, status: 'planned' },
  ] }]
  return renderWithProviders(<Dashboard />, { roadmapState: state })
}

it('shows loading instead of zero GE coverage while the request is pending', () => {
  fetchCatalogCourses.mockReturnValue(new Promise(() => {}))
  renderGeProgress()
  expect(screen.getByText('Loading GE progress...')).toBeDefined()
  expect(screen.queryByText(/areas completed/)).toBeNull()
  expect(screen.getByRole('button', { name: /General Education/ }).disabled).toBe(true)
})

it('shows unavailable instead of missing areas after a failed request', async () => {
  fetchCatalogCourses.mockRejectedValue(new Error('Network error'))
  renderGeProgress()
  expect(await screen.findByRole('alert')).toBeDefined()
  expect(screen.queryByText(/areas completed/)).toBeNull()
  expect(screen.getByRole('button', { name: /General Education/ }).disabled).toBe(true)
})

it('tracks normalized GE areas across roadmap statuses without section payloads', async () => {
  fetchCatalogCourses.mockResolvedValue([
    { courseId: 901, courseCode: 'CHAD 70', geAreas: ['4', 'E', '3'] },
    { courseId: 902, courseCode: 'GE 2', geAreas: ['5A', '5C'] },
    { courseId: 903, courseCode: 'GE 3', geAreas: ['UD 3'] },
    { courseId: 904, courseCode: 'GE 4', geAreas: ['1A'] },
    { courseId: 905, courseCode: 'GE 5', geAreas: ['1B'] },
    { courseId: 906, courseCode: 'GE 6', geAreas: ['4'] },
  ])
  renderGeProgress()
  expect(await screen.findByText('3 / 19 areas completed')).toBeDefined()
  expect(screen.getByText('3 areas planned')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: /General Education/ }))
  const dialog = within(screen.getByRole('dialog'))
  const row = area => within(dialog.getByText(new RegExp(`GE ${area}$`), { selector: '.requirement-course-code' }).closest('.requirement-course-row'))
  expect(row('4').getByText('Completed')).toBeDefined()
  expect(row('E').getByText('Completed')).toBeDefined()
  expect(row('3').getByText('Completed')).toBeDefined()
  expect(row('5A').getByText('Planned')).toBeDefined()
  expect(row('UD 3').getByText('Planned')).toBeDefined()
  expect(row('1A').getByText('Missing')).toBeDefined()
  expect(row('1B').getByText('Missing')).toBeDefined()
  expect(row('6').getByText('Missing')).toBeDefined()
  fireEvent.click(dialog.getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
