import { courseMap } from '../../data/courses'
import './ValidationAlert.css'

function getCourseName(courseId) {
  const course = courseMap.get(courseId)
  return course ? course.courseCode : `Course ${courseId}`
}

function ValidationAlert({ violations }) {
  if (!violations || violations.length === 0) return null

  return (
    <div className="validation-alert" role="alert">
      <div className="validation-alert-header">
        {violations.length} prerequisite {violations.length === 1 ? 'issue' : 'issues'}
      </div>
      <ul className="validation-alert-list">
        {violations.map((v, i) => (
          <li key={i}>
            <strong>{getCourseName(v.courseId)}</strong>
            {v.type === "prereq"
              ? ` requires ${getCourseName(v.missingPrereqId)} to be completed first`
              : ` needs corequisite ${getCourseName(v.missingPrereqId)} in the same or earlier semester`
            }
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ValidationAlert
