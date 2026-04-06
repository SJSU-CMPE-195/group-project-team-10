import { useState } from 'react'
import { courseMap } from '../../data/courses'
import './CourseCard.css'

function CourseCard({ course, prereqs }) {
  const [expanded, setExpanded] = useState(false)

  const prereqNames = prereqs.map(p => {
    const c = courseMap.get(p.prereqCourseId)
    return c ? c.courseCode : `Course ${p.prereqCourseId}`
  })

  return (
    <div className="course-card">
      <div className="course-card-header">
        <span className="course-card-code">{course.courseCode}</span>
        <span className="course-card-dept">{course.department}</span>
      </div>
      <div className="course-card-title">{course.courseTitle}</div>
      <div className="course-card-units">{course.units} units</div>
      {course.description && (
        <div className={`course-card-desc ${expanded ? 'expanded' : ''}`}>
          {expanded ? course.description : course.description.slice(0, 80)}
          {course.description.length > 80 && (
            <button
              className="course-card-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : '...Show more'}
            </button>
          )}
        </div>
      )}
      {prereqNames.length > 0 && (
        <div className="course-card-prereqs">
          Prerequisites: {prereqNames.join(', ')}
        </div>
      )}
    </div>
  )
}

export default CourseCard
