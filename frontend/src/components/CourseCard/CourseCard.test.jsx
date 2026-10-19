import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import CourseCard from './CourseCard'
import { renderWithProviders } from '../../test-utils'

const mockCourse = {
  courseId: 4,
  courseCode: 'CMPE 120',
  courseTitle: 'Computer Organization and Architecture',
  description: 'Introduction to computer organization, digital logic, and processor design.',
  units: 3,
  department: 'CMPE',
}

const mockPrereqs = [
  { courseId: 4, prereqCourseId: 2, prereqType: 'prereq' },
]

// a term that isn't on the sample roadmap, so adding skips the prereq check
function makeSection(courseCode, sectionCode = '01') {
  return {
    id: `${courseCode}-${sectionCode}`,
    courseCode,
    sectionCode,
    classNumber: 1000 + Number(sectionCode),
    days: 'MW',
    times: '10:30AM-11:45AM',
    term: 'Spring 2030',
  }
}

function renderCourseCard(ui) {
  return renderWithProviders(ui)
}

describe('CourseCard', () => {
  it('renders course code', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('CMPE 120')).toBeDefined()
  })

  it('renders course title', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('Computer Organization and Architecture')).toBeDefined()
  })

  it('renders department badge', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('CMPE')).toBeDefined()
  })

  it('renders units', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('3 units')).toBeDefined()
  })

  it('renders prerequisites', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={mockPrereqs} />)
    expect(screen.getByText(/Prerequisites:/)).toBeDefined()
    expect(screen.getByText(/CMPE 50/)).toBeDefined()
  })

  it('does not render prerequisites section when none exist', () => {
    renderCourseCard(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.queryByText(/Prerequisites:/)).toBeNull()
  })

  describe('adding a section', () => {
    afterEach(() => {
      localStorage.clear()
    })

    function addFirstSection(section) {
      const onSectionAdded = vi.fn()
      renderCourseCard(
        <CourseCard course={mockCourse} prereqs={[]} sections={[section]} onSectionAdded={onSectionAdded} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'View 1 sections' }))
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      return onSectionAdded
    }

    it('reports the added section', () => {
      const onSectionAdded = addFirstSection(makeSection('CMPE 120'))
      expect(onSectionAdded).toHaveBeenCalledWith(expect.objectContaining({ id: 'CMPE 120-01' }))
    })

    it('does not report a section that conflicts', () => {
      localStorage.setItem('coursePlanner.schedulesByTerm', JSON.stringify({
        'Spring 2030': [makeSection('CMPE 131')],
      }))

      const onSectionAdded = addFirstSection(makeSection('CMPE 120', '02'))
      expect(onSectionAdded).not.toHaveBeenCalled()
    })
  })
})
