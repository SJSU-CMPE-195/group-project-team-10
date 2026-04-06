import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ValidationAlert from './ValidationAlert'

describe('ValidationAlert', () => {
  it('renders nothing when there are no violations', () => {
    const { container } = render(<ValidationAlert violations={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when violations is null', () => {
    const { container } = render(<ValidationAlert violations={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders a violation message for a prerequisite issue', () => {
    const violations = [{
      courseId: 8,   // CMPE 126
      semesterId: 1,
      missingPrereqId: 4,  // CMPE 120
      type: "prereq",
    }]
    render(<ValidationAlert violations={violations} />)
    expect(screen.getByText('1 prerequisite issue')).toBeDefined()
    expect(screen.getByText(/CMPE 126/)).toBeDefined()
    expect(screen.getByText(/CMPE 120/)).toBeDefined()
    expect(screen.getByText(/completed first/)).toBeDefined()
  })

  it('renders a corequisite violation', () => {
    const violations = [{
      courseId: 26,
      semesterId: 1,
      missingPrereqId: 21,
      type: "coreq",
    }]
    render(<ValidationAlert violations={violations} />)
    expect(screen.getByText(/corequisite/)).toBeDefined()
  })

  it('renders multiple violations', () => {
    const violations = [
      { courseId: 8, semesterId: 1, missingPrereqId: 4, type: "prereq" },
      { courseId: 9, semesterId: 1, missingPrereqId: 5, type: "prereq" },
    ]
    render(<ValidationAlert violations={violations} />)
    expect(screen.getByText('2 prerequisite issues')).toBeDefined()
  })

  it('has alert role for accessibility', () => {
    const violations = [
      { courseId: 8, semesterId: 1, missingPrereqId: 4, type: "prereq" },
    ]
    render(<ValidationAlert violations={violations} />)
    expect(screen.getByRole('alert')).toBeDefined()
  })
})
