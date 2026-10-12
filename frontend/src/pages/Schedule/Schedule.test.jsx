import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test-utils'
import { useRoadmap } from '../../context/RoadmapContext'
import Schedule from './Schedule'

// sampleRoadmap has CMPE 120 in Fall 2023 and CMPE 131 in Spring 2024
function makeSection(courseCode) {
  return {
    id: `${courseCode}-01`,
    courseCode,
    sectionCode: '01',
    days: 'MW',
    times: '10:30AM-11:45AM',
    location: 'ENG 189',
    term: 'Fall 2023',
  }
}

function seedSchedule(sections) {
  localStorage.setItem('coursePlanner.schedulesByTerm', JSON.stringify({ 'Fall 2023': sections }))
  localStorage.setItem('coursePlanner.activeScheduleTerm', 'Fall 2023')
}

function FallSemesterCourses() {
  const { semesters } = useRoadmap()
  const fall = semesters.find(semester => semester.term === 'Fall 2023')
  return <p data-testid="fall-courses">{fall.courses.map(course => course.courseId).join(',')}</p>
}

describe('Schedule leave prompt', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  async function renderSchedule() {
    const result = renderWithProviders(
      <>
        <Schedule />
        <FallSemesterCourses />
      </>,
      { route: '/schedule' }
    )
    // let the terms and sections fetches settle
    await screen.findByText('Roadmap courses for Fall 2023')
    return result
  }

  // schedules one section in Fall 2023, then tries to leave for the dashboard
  async function leaveWith(courseCode) {
    seedSchedule([makeSection(courseCode)])
    const result = await renderSchedule()
    await act(() => result.router.navigate('/'))
    return result
  }

  it('asks to apply courses that are not on the roadmap yet', async () => {
    await leaveWith('CMPE 131')

    const dialog = screen.getByRole('dialog', { name: 'Apply schedule to roadmap?' })
    expect(within(dialog).getByText('CMPE 131')).toBeDefined()
  })

  it('adds the courses to the roadmap on Apply and leave', async () => {
    const { router } = await leaveWith('CMPE 131')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply and leave' }))
    })

    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByTestId('fall-courses').textContent.split(',')).toContain('6')
  })

  it('stays on the page on Stay', async () => {
    const { router } = await leaveWith('CMPE 131')
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/schedule')
  })

  it('leaves without a prompt when the roadmap already has every course', async () => {
    const { router } = await leaveWith('CMPE 120')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(router.state.location.pathname).toBe('/')
  })
})
