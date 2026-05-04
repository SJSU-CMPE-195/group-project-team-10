import './ValidationAlert.css'

function getCourseName(courseId, courseMap) {
  const course = courseMap.get(courseId)
  return course ? course.courseCode : `Course ${courseId}`
}

function ValidationAlert({ violations, courseMap = new Map() }) {
  if (!violations || violations.length === 0) return null

  return (
    <div className="validation-alert" role="alert">
      <div className="validation-alert-header">
        {violations.length} prerequisite {violations.length === 1 ? 'issue' : 'issues'}
      </div>
      <ul className="validation-alert-list">
        {violations.map((v, i) => (
          <li key={i}>
            <strong>{getCourseName(v.courseId, courseMap)}</strong>
            {v.type === "prereq"
              ? ` must be planned after ${getCourseName(v.missingPrereqId, courseMap)}`
              : ` must be taken in the same semester as ${getCourseName(v.missingPrereqId, courseMap)}`
            }
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ValidationAlert
