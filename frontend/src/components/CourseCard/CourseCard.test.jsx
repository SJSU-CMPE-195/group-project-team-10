import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CourseCard from './CourseCard'
import { ScheduleProvider } from '../../context/ScheduleContext'

const mockCourse = {
  courseId: 4,
  courseCode: "CMPE 120",
  courseTitle: "Computer Organization and Architecture",
  description: "Introduction to computer organization, digital logic, and processor design.",
  units: 3,
  department: "CMPE",
}

const mockPrereqs = [
  { courseId: 4, prereqCourseId: 2, prereqType: "prereq" },
]

function renderCourseCard(ui) {
  return render(
    <ScheduleProvider>
      {ui}
    </ScheduleProvider>
  )
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
})