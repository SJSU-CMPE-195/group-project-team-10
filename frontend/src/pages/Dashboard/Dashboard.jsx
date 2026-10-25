import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRoadmap } from '../../context/RoadmapContext'
import { validateSemesterPlan } from '../../utils/prerequisiteValidator'
import { fetchCatalogCourses } from '../../api/catalog'
import './Dashboard.css'

// Codes observed in the schedule CSVs, matching GeAreaParser's API output.
const GE_AREAS = ['1A', '1B', '1C', '2', '3A', '3B', '4', '5A', '5B', '5C', '6', 'UD 2/5', 'UD 3', 'UD 4']

function Dashboard() {
  const {
    semesters,
    courses,
    prerequisites,
    degreeRequirements,
    sagePrograms,
    majorInfo,
    isLoadingRoadmap,
    roadmapError,
  } = useRoadmap()
  const [selectedRequirementId, setSelectedRequirementId] = useState(null)
  const [selectedSageProgramId, setSelectedSageProgramId] = useState(null)
  const [showGeDetails, setShowGeDetails] = useState(false)
  const [catalogCourses, setCatalogCourses] = useState([])
  const [geLoadStatus, setGeLoadStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function loadCatalogCourses() {
      try {
        const data = await fetchCatalogCourses()

        if (!cancelled) {
          setCatalogCourses(data)
          setGeLoadStatus('loaded')
        }
      } catch {
        if (!cancelled) setGeLoadStatus('failed')
      }
    }

    loadCatalogCourses()

    return () => {
      cancelled = true
    }
  }, [])
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

  const geProgress = useMemo(() => {
    return GE_AREAS.map(area => {
      const matchingCourses = catalogCourses.filter(course =>
        (course.geAreas || []).includes(area)
      )

      const completedCourses = matchingCourses.filter(
        course => courseStatusById.get(course.courseId) === 'completed'
      )

      const plannedCourses = matchingCourses.filter(course => {
        const status = courseStatusById.get(course.courseId)

        return status === 'planned' || status === 'in_progress'
      })

      let status = 'missing'

      if (completedCourses.length > 0) {
        status = 'completed'
      } else if (plannedCourses.length > 0) {
        status = 'planned'
      }

      return {
        area,
        status,
        completedCourses,
        plannedCourses,
      }
    })
  }, [catalogCourses, courseStatusById])

  const completedGeAreas = geProgress.filter(
    item => item.status === 'completed'
  ).length

  const plannedGeAreas = geProgress.filter(
    item => item.status === 'planned'
  ).length

  const geProgressPct =
    GE_AREAS.length > 0
      ? Math.round((completedGeAreas / GE_AREAS.length) * 100)
      : 0

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

  const selectedSageProgram =
    sagePrograms?.find(
      program => program.sageProgramId === selectedSageProgramId
    ) || null

  const formatSpecializationName = role => {
    const names = {
      SPECIALIZATION_ENTERPRISE: 'Enterprise Software Technologies',
      SPECIALIZATION_CLOUD: 'Cloud Computing and Virtualization',
      SPECIALIZATION_SOFTWARE_SYSTEMS: 'Software Systems Engineering',
      SPECIALIZATION_NETWORKING: 'Networking Software',
      SPECIALIZATION_DATA_SCIENCE: 'Data Science',
      SPECIALIZATION_CYBERSECURITY: 'Cybersecurity',
      SPECIALIZATION_INTELLIGENT_DATA: 'Intelligent Data Systems',
      SPECIALIZATION_AUTONOMOUS: 'Autonomous Systems',
      SPECIALIZATION_CYBERSECURITY_AI: 'Cybersecurity in AI',
      SPECIALIZATION_SYSTEM_SOFTWARE: 'System Software Architecture',
      SPECIALIZATION_NETWORK_SYSTEMS: 'Network Systems',
      SPECIALIZATION_EMBEDDED: 'Embedded Systems',
      SPECIALIZATION_MACHINE_LEARNING: 'Machine Learning Engineering',
    }

    return names[role] || role
  }

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

      {sagePrograms?.length > 0 && (
        <div className="sage-card">
          <div className="sage-card-header">
            <div>
              <div className="sage-card-label">SAGE / 4+1 Options</div>
              <div className="sage-card-title">
                Accelerated Graduate Programs
              </div>
            </div>

            <span className="sage-card-count">
              {sagePrograms.length} option{sagePrograms.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="sage-card-description">
            Earn your bachelor&apos;s and master&apos;s degrees through an
            accelerated SAGE pathway.
          </p>

          <div className="sage-program-list">
            {sagePrograms.map(program => (
              <button
                key={program.sageProgramId}
                type="button"
                className="sage-program-option"
                onClick={() =>
                  setSelectedSageProgramId(program.sageProgramId)
                }
              >
                <div>
                  <div className="sage-program-name">
                    {program.graduateProgramName}
                  </div>

                  <div className="sage-program-meta">
                    Min GPA {program.minimumGpa.toFixed(1)}
                    {' • '}
                    {program.minimumUndergradUnits}–{program.maximumUndergradUnits} undergraduate units
                    {' • '}
                    {program.totalProgramUnits} total units
                  </div>
                </div>

                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="requirements-grid">
        {degreeRequirements
          .filter(req => req.categoryName !== 'General Education')
          .map(req => {
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
        <button
          type="button"
          className="requirement-card"
          onClick={() => setShowGeDetails(true)}
          disabled={geLoadStatus !== 'loaded'}
        >
          <div className="requirement-card-header">
            <span className="requirement-name">
              General Education
            </span>

            <span
              className="requirement-card-chevron"
              aria-hidden="true"
            >
              ›
            </span>
          </div>

          {geLoadStatus === 'loading' && <div role="status">Loading GE progress...</div>}
          {geLoadStatus === 'failed' && <div role="alert">GE progress is unavailable. Please reload to try again.</div>}
          {geLoadStatus === 'loaded' && (
            <>
              <div className="requirement-progress">
                {completedGeAreas} / {GE_AREAS.length} areas completed
              </div>

              <div className="requirement-progress">
                {plannedGeAreas} areas planned
              </div>

              <div className="progress-bar-track small">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${geProgressPct}%` }}
                />
              </div>
            </>
          )}
        </button>
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

      {showGeDetails && geLoadStatus === 'loaded' && (
        <div
          className="requirement-detail-backdrop"
          onClick={() => setShowGeDetails(false)}
        >
          <div
            className="requirement-detail-modal"
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="requirement-detail-header">
              <div>
                <div className="requirement-detail-label">
                  General Education
                </div>

                <h2>GE Area Progress</h2>
                <p>Area coverage only; this is not a full GE graduation audit.</p>
              </div>

              <button
                type="button"
                className="requirement-detail-close"
                onClick={() => setShowGeDetails(false)}
              >
                Close
              </button>
            </div>

            <div className="requirement-detail-meta">
              <span>{completedGeAreas} / {GE_AREAS.length} areas completed</span>
            </div>

            <div className="requirement-detail-stats">
              <div>
                <div className="requirement-detail-stat-label">
                  Completed areas
                </div>

                <div className="requirement-detail-stat-value">
                  {completedGeAreas}
                </div>
              </div>

              <div>
                <div className="requirement-detail-stat-label">
                  Planned areas
                </div>

                <div className="requirement-detail-stat-value">
                  {plannedGeAreas}
                </div>
              </div>

              <div>
                <div className="requirement-detail-stat-label">
                  Missing areas
                </div>

                <div className="requirement-detail-stat-value">
                  {GE_AREAS.length - completedGeAreas - plannedGeAreas}
                </div>
              </div>
            </div>

            <div className="requirement-detail-list-wrap">
              <div className="requirement-detail-list">
                <h3>Covered / Planned</h3>

                {geProgress.filter(item => item.status !== 'missing').length > 0 ? (
                  geProgress
                    .filter(item => item.status !== 'missing')
                    .map(item => {
                      const areaCourses =
                        item.status === 'completed'
                          ? item.completedCourses
                          : item.plannedCourses

                      return (
                        <div
                          key={item.area}
                          className="requirement-course-row"
                        >
                          <div className="requirement-course-main">
                            <span className="requirement-course-code">
                              {item.status === 'completed' ? '✓' : '○'} GE {item.area}
                            </span>

                            {areaCourses.length > 0 && (
                              <span className="requirement-course-title">
                                {areaCourses
                                  .map(course => course.courseCode)
                                  .join(', ')}
                              </span>
                            )}
                          </div>

                          <span className="requirement-course-units">
                            {item.status === 'completed'
                              ? 'Completed'
                              : 'Planned'}
                          </span>
                        </div>
                      )
                    })
                ) : (
                  <div className="requirement-course-empty">
                    No GE areas are covered or planned yet.
                  </div>
                )}
              </div>

              <div className="requirement-detail-list">
                <h3>Missing</h3>

                {geProgress.filter(item => item.status === 'missing').length > 0 ? (
                  geProgress
                    .filter(item => item.status === 'missing')
                    .map(item => (
                      <div
                        key={item.area}
                        className="requirement-course-row"
                      >
                        <div className="requirement-course-main">
                          <span className="requirement-course-code">
                            ○ GE {item.area}
                          </span>
                        </div>

                        <span className="requirement-course-units">
                          Missing
                        </span>
                      </div>
                    ))
                ) : (
                  <div className="requirement-course-empty">
                    All GE areas are covered.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSageProgram && (
        <div
          className="requirement-detail-backdrop"
          onClick={() => setSelectedSageProgramId(null)}
        >
          <div
            className="requirement-detail-modal sage-detail-modal"
            role="dialog"
            aria-modal="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="requirement-detail-header">
              <div>
                <div className="requirement-detail-label">
                  SAGE / 4+1 Pathway
                </div>

                <h2>
                  {majorInfo?.majorName}
                  {' + '}
                  {selectedSageProgram.graduateProgramName}
                </h2>
              </div>

              <button
                type="button"
                className="requirement-detail-close"
                onClick={() => setSelectedSageProgramId(null)}
              >
                Close
              </button>
            </div>

            <div className="sage-detail-requirements">
              <div>
                <strong>Minimum GPA</strong>
                <span>{selectedSageProgram.minimumGpa.toFixed(1)}</span>
              </div>

              <div>
                <strong>Admission unit range</strong>
                <span>
                  {selectedSageProgram.minimumUndergradUnits}
                  {' – '}
                  {selectedSageProgram.maximumUndergradUnits}
                </span>
              </div>

              <div>
                <strong>Total SAGE Program Units</strong>
                <span>{selectedSageProgram.totalProgramUnits} units</span>
              </div>
            </div>

            <div className="sage-course-section">
              <h3>Graduate Requirements</h3>

              {selectedSageProgram.requirements?.length > 0 ? (
                selectedSageProgram.requirements.map(requirement => (
                  <div
                    key={requirement.requirementId}
                    className="sage-requirement-block"
                  >
                    <div className="sage-requirement-header">
                      <div>
                        <div className="sage-requirement-name">
                          {requirement.requirementName}
                        </div>

                        {requirement.description && (
                          <div className="sage-requirement-description">
                            {requirement.description}
                          </div>
                        )}
                      </div>

                      <span className="sage-requirement-units">
                        {requirement.requiredUnits} units
                      </span>
                    </div>

                    {requirement.courses?.length > 0 ? (
                      <div className="sage-requirement-courses">

                        {requirement.requirementName === 'Specialization Courses' ? (
                          Object.entries(
                            requirement.courses.reduce((groups, course) => {
                              const key = course.courseRole

                              if (!groups[key]) {
                                groups[key] = []
                              }

                              groups[key].push(course)
                              return groups
                            }, {})
                          ).map(([role, specializationCourses]) => (
                            <div
                              key={role}
                              className="sage-specialization-group"
                            >
                              <div className="sage-specialization-name">
                                {formatSpecializationName(role)}
                              </div>

                              {specializationCourses.map(course => (
                                <div
                                  key={`${course.courseId}-${role}`}
                                  className="sage-course-row"
                                >
                                  <div>
                                    <div className="sage-course-code">
                                      {course.courseCode}
                                    </div>

                                    <div className="sage-course-title">
                                      {course.courseTitle}
                                    </div>
                                  </div>

                                  <div className="sage-course-info">
                                    <span>{course.units} units</span>

                                    {course.doubleCountEligible && (
                                      <span className="sage-course-role">
                                        Double-count eligible
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          requirement.courses.map(course => (
                            <div
                              key={`${requirement.requirementId}-${course.courseId}-${course.courseRole}`}
                              className="sage-course-row"
                            >
                              <div>
                                <div className="sage-course-code">
                                  {course.courseCode}
                                </div>

                                <div className="sage-course-title">
                                  {course.courseTitle}
                                </div>
                              </div>

                              <div className="sage-course-info">
                                <span>{course.units} units</span>

                                {course.doubleCountEligible && (
                                  <span className="sage-course-role">
                                    Double-count eligible
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}

                      </div>
                    ) : (
                      <div className="sage-requirement-rule">
                        See requirement description above.
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="requirement-course-empty">
                  No SAGE requirement data available yet.
                </div>
              )}
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
