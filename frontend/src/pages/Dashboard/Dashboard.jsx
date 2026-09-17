import { useMemo, useState } from 'react'
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
  const [selectedRequirementId, setSelectedRequirementId] = useState(null)
  const courseMap = new Map(courses.map(c => [c.courseId, c]))
  const violations = validateSemesterPlan(semesters, prerequisites)

  const courseStatusById = useMemo(() => {
    const statusMap = new Map()
    for (const sem of semesters) {
      for (const course of sem.courses) {
        if (!statusMap.has(course.courseId)) {
          statusMap.set(course.courseId, course.status)
        }
      }
    }
    return statusMap
  }, [semesters])

  const selectedRequirement = degreeRequirements.find(req => req.requirementId === selectedRequirementId) || null
  const selectedRequirementCourses = selectedRequirement
    ? [...new Set(selectedRequirement.courseIds)]
        .map(courseId => courseMap.get(courseId))
        .filter(Boolean)
        .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
    : []

  const completedSelectedCourses = selectedRequirementCourses.filter(course => courseStatusById.get(course.courseId) === 'completed')
  const missingSelectedCourses = selectedRequirementCourses.filter(course => courseStatusById.get(course.courseId) !== 'completed')

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
            <button
              key={req.requirementId}
              type="button"
              className="requirement-card"
              onClick={() => setSelectedRequirementId(req.requirementId)}
            >
              <div className="requirement-card-header">
                <span className="requirement-name">{req.categoryName}</span>
                <span className="requirement-card-chevron" aria-hidden="true">›</span>
              </div>
              <div className="requirement-progress">
                {categoryUnits} / {req.requiredUnits} units
              </div>
              <div className="progress-bar-track small">
                <div className="progress-bar-fill" style={{ width: `${catPct}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      {selectedRequirement && (
        <div className="requirement-detail-backdrop" onClick={() => setSelectedRequirementId(null)}>
          <div className="requirement-detail-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="requirement-detail-header">
              <div>
                <div className="requirement-detail-label">Requirement</div>
                <h2>{selectedRequirement.categoryName}</h2>
              </div>
              <button type="button" className="requirement-detail-close" onClick={() => setSelectedRequirementId(null)} aria-label="Close requirement details">
                Close
              </button>
            </div>

            <div className="requirement-detail-meta">
              <span>{selectedRequirement.requiredUnits} units required</span>
              <span>{completedSelectedCourses.length} completed</span>
            </div>

            <div className="requirement-detail-stats">
              <div>
                <div className="requirement-detail-stat-label">Completed units</div>
                <div className="requirement-detail-stat-value">
                  {completedSelectedCourses.reduce((sum, course) => sum + course.units, 0)} / {selectedRequirement.requiredUnits}
                </div>
              </div>
              <div>
                <div className="requirement-detail-stat-label">Courses</div>
                <div className="requirement-detail-stat-value">{selectedRequirementCourses.length}</div>
              </div>
            </div>

            <div className="requirement-detail-list-wrap">
              <div className="requirement-detail-list">
                <h3>Completed</h3>
                {completedSelectedCourses.length > 0 ? (
                  completedSelectedCourses.map(course => (
                    <div key={course.courseId} className="requirement-course-row completed">
                      <div className="requirement-course-main">
                        <span className="requirement-course-code">✓ {course.courseCode}</span>
                        <span className="requirement-course-title">{course.courseTitle}</span>
                      </div>
                      <span className="requirement-course-units">{course.units} units</span>
                    </div>
                  ))
                ) : (
                  <div className="requirement-course-empty">No completed courses in this requirement yet.</div>
                )}
              </div>

              <div className="requirement-detail-list">
                <h3>Missing</h3>
                {missingSelectedCourses.length > 0 ? (
                  missingSelectedCourses.map(course => (
                    <div key={course.courseId} className="requirement-course-row missing">
                      <div className="requirement-course-main">
                        <span className="requirement-course-code">○ {course.courseCode}</span>
                        <span className="requirement-course-title">{course.courseTitle}</span>
                      </div>
                      <span className="requirement-course-units">{course.units} units</span>
                    </div>
                  ))
                ) : (
                  <div className="requirement-course-empty">No missing courses in this requirement.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
