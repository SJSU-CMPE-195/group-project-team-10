import { Link } from 'react-router-dom'
import { useRoadmap } from '../../context/RoadmapContext'
import { validateSemesterPlan } from '../../utils/prerequisiteValidator'
import './Dashboard.css'

function Dashboard() {
  const {
    semesters,
    courses,
    prerequisites,
    degreeRequirements,
    majorInfo,
    isLoadingRoadmap,
    roadmapError,
  } = useRoadmap()
  const courseMap = new Map(courses.map(c => [c.courseId, c]))
  const violations = validateSemesterPlan(semesters, prerequisites)

  if (isLoadingRoadmap && !majorInfo) {
    return (
      <div className="dashboard">
        <h1>Course Planner Plus</h1>
        <div className="dashboard-status">Loading roadmap data from the database...</div>
      </div>
    )
  }

  if (roadmapError && !majorInfo) {
    return (
      <div className="dashboard">
        <h1>Course Planner Plus</h1>
        <div className="dashboard-warning">{roadmapError}</div>
        <div className="dashboard-actions">
          <Link to="/roadmap" className="action-button primary">View Roadmap</Link>
          <Link to="/catalog" className="action-button">Browse Catalog</Link>
        </div>
      </div>
    )
  }

  const completedIds = new Set()
  let completedUnits = 0
  let plannedUnits = 0
  for (const sem of semesters) {
    for (const c of sem.courses) {
      const course = courseMap.get(c.courseId)
      if (c.status === "completed") {
        completedIds.add(c.courseId)
        if (course) completedUnits += course.units
      }
      if (course && c.status !== "failed") plannedUnits += course.units
    }
  }

  const totalRequiredUnits = majorInfo?.totalRequiredUnits || 0
  const progressPct = totalRequiredUnits > 0
    ? Math.min(100, Math.round((completedUnits / totalRequiredUnits) * 100))
    : 0
  const plannedPct = totalRequiredUnits > 0
    ? Math.min(100, Math.round((plannedUnits / totalRequiredUnits) * 100))
    : 0

  return (
    <div className="dashboard">
      <h1>Course Planner Plus</h1>
      <p className="dashboard-subtitle">{majorInfo?.majorName}</p>

      <div className="progress-card">
        <div className="progress-header">
          <span className="progress-label">Degree Progress</span>
          <span className="progress-value">{completedUnits} / {totalRequiredUnits} units ({progressPct}%)</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="dashboard-progress-note">
          {plannedUnits} / {totalRequiredUnits} units are currently on the roadmap ({plannedPct}%).
        </div>
      </div>

      <div className="requirements-grid">
        {degreeRequirements.map(req => {
          const completedInCategory = req.courseIds.filter(id => completedIds.has(id))
          let categoryUnits = 0
          for (const id of completedInCategory) {
            const course = courseMap.get(id)
            if (course) categoryUnits += course.units
          }
          const catPct = req.requiredUnits > 0
            ? Math.min(100, Math.round((categoryUnits / req.requiredUnits) * 100))
            : 0

          return (
            <div key={req.requirementId} className="requirement-card">
              <div className="requirement-name">{req.categoryName}</div>
              <div className="requirement-progress">
                {categoryUnits} / {req.requiredUnits} units
              </div>
              <div className="progress-bar-track small">
                <div className="progress-bar-fill" style={{ width: `${catPct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {violations.length > 0 && (
        <div className="dashboard-warning">
          {violations.length} prerequisite {violations.length === 1 ? 'issue' : 'issues'} found in your roadmap
        </div>
      )}

      <div className="dashboard-actions">
        <Link to="/roadmap" className="action-button primary">View Roadmap</Link>
        <Link to="/catalog" className="action-button">Browse Catalog</Link>
      </div>
    </div>
  )
}

export default Dashboard
