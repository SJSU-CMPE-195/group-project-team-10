import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CourseCard from './CourseCard'

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

describe('CourseCard', () => {
  it('renders course code', () => {
    render(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('CMPE 120')).toBeDefined()
  })

  it('renders course title', () => {
    render(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('Computer Organization and Architecture')).toBeDefined()
  })

  it('renders department badge', () => {
    render(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('CMPE')).toBeDefined()
  })

  it('renders units', () => {
    render(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.getByText('3 units')).toBeDefined()
  })

  it('renders prerequisites', () => {
    render(<CourseCard course={mockCourse} prereqs={mockPrereqs} />)
    expect(screen.getByText(/Prerequisites:/)).toBeDefined()
    expect(screen.getByText(/CMPE 50/)).toBeDefined()
  })

  it('does not render prerequisites section when none exist', () => {
    render(<CourseCard course={mockCourse} prereqs={[]} />)
    expect(screen.queryByText(/Prerequisites:/)).toBeNull()
  })
})
