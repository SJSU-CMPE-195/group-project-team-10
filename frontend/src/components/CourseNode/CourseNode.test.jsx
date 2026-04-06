import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ReactFlowProvider } from '@xyflow/react'
import CourseNode from './CourseNode'

function renderCourseNode(data) {
  return render(
    <ReactFlowProvider>
      <CourseNode data={data} />
    </ReactFlowProvider>
  )
}

describe('CourseNode', () => {
  const defaultData = {
    courseCode: 'CMPE 120',
    courseTitle: 'Computer Organization and Architecture',
    units: 3,
    status: 'planned',
  }

  it('renders course code', () => {
    renderCourseNode(defaultData)
    expect(screen.getByText('CMPE 120')).toBeDefined()
  })

  it('renders course title', () => {
    renderCourseNode(defaultData)
    expect(screen.getByText('Computer Organization and Architecture')).toBeDefined()
  })

  it('renders units', () => {
    renderCourseNode(defaultData)
    expect(screen.getByText('3 units')).toBeDefined()
  })

  it('renders status', () => {
    renderCourseNode(defaultData)
    expect(screen.getByText('planned')).toBeDefined()
  })

  it('applies completed status class', () => {
    const { container } = renderCourseNode({ ...defaultData, status: 'completed' })
    expect(container.querySelector('.course-node--completed')).not.toBeNull()
  })

  it('applies failed status class', () => {
    const { container } = renderCourseNode({ ...defaultData, status: 'failed' })
    expect(container.querySelector('.course-node--failed')).not.toBeNull()
  })

  it('applies blocked status class', () => {
    const { container } = renderCourseNode({ ...defaultData, status: 'blocked' })
    expect(container.querySelector('.course-node--blocked')).not.toBeNull()
  })
})
