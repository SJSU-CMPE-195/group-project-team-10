import { useState } from 'react'
import { courseMap } from '../../data/courses'
import { useRoadmap } from '../../context/RoadmapContext'
import { useSchedule } from '../../context/useSchedule'
import './CourseCard.css'

function normalizeTerm(term) {
  return (term || '').trim().toLowerCase()
}

function getCourseLabel(courseId, courses) {
  const course = courses.find(item => item.courseId === courseId)
  return course ? course.courseCode : `Course ${courseId}`
}

function getSemesterIndexForTerm(semesters, term) {
  return semesters.findIndex(
    semester => normalizeTerm(semester.term) === normalizeTerm(term)
  )
}

function isCompleted(course) {
  return course.status === 'completed'
}

function courseCompletedBeforeSemester(semesters, courseId, semesterIndex) {
  if (semesterIndex <= 0) return false

  return semesters
    .slice(0, semesterIndex)
    .some(semester =>
      semester.courses.some(course =>
        course.courseId === courseId && isCompleted(course)
      )
    )
}

function courseCompletedBeforeOrScheduledDuringSemester(semesters, courseId, semesterIndex) {
  if (semesterIndex < 0) return false

  return semesters
    .slice(0, semesterIndex + 1)
    .some((semester, index) =>
      semester.courses.some(course => {
        if (course.courseId !== courseId) return false

        const isBeforeTargetSemester = index < semesterIndex
        const isTargetSemester = index === semesterIndex

        return (
          (isBeforeTargetSemester && isCompleted(course)) ||
          isTargetSemester
        )
      })
    )
}

function getPrereqWarnings({ course, section, roadmapState }) {
  if (!course?.courseId) return []

  const semesterIndex = getSemesterIndexForTerm(roadmapState.semesters, section.term)

  if (semesterIndex === -1) {
    return []
  }

  const requirements = roadmapState.prerequisites.filter(
    prereq => prereq.courseId === course.courseId
  )

  return requirements
    .filter(prereq => {
      if (prereq.prereqType === 'coreq') {
        return !courseCompletedBeforeOrScheduledDuringSemester(
          roadmapState.semesters,
          prereq.prereqCourseId,
          semesterIndex
        )
      }

      return !courseCompletedBeforeSemester(
        roadmapState.semesters,
        prereq.prereqCourseId,
        semesterIndex
      )
    })
    .map(prereq => ({
      ...prereq,
      courseCode: getCourseLabel(prereq.courseId, roadmapState.courses),
      requiredCourseCode: getCourseLabel(prereq.prereqCourseId, roadmapState.courses),
    }))
}

function CourseCard({ course, prereqs, sections = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [gradeModal, setGradeModal] = useState(null)
  const [conflictModal, setConflictModal] = useState(null)
  const [prereqModal, setPrereqModal] = useState(null)

  const roadmapState = useRoadmap()
  const { addSection, removeSection, isSelected, findConflict } = useSchedule()
  const availableTerms = course.availableTerms || []

  const prereqNames = prereqs.map(p => {
    const c = courseMap.get(p.prereqCourseId)
    return c ? c.courseCode : `Course ${p.prereqCourseId}`
  })

  function buildScheduledSection(section) {
    return {
      ...section,
      courseId: course.courseId,
      courseTitle: course.courseTitle,
      units: course.units,
      department: course.department,
      description: course.description,
    }
  }

  function addSectionWithoutPrereqCheck(section) {
    const result = addSection(section)

    if (result?.ok === false && result.conflict) {
      setConflictModal({
        section,
        conflict: result.conflict,
      })
    }
  }

  function handleAddSection(section) {
    const scheduledSection = buildScheduledSection(section)
    const conflict = findConflict(scheduledSection, scheduledSection.term)

    if (conflict) {
      setConflictModal({
        section: scheduledSection,
        conflict,
      })
      return
    }

    const warnings = getPrereqWarnings({
      course,
      section: scheduledSection,
      roadmapState,
    })

    if (warnings.length > 0) {
      setPrereqModal({
        section: scheduledSection,
        warnings,
      })
      return
    }

    addSectionWithoutPrereqCheck(scheduledSection)
  }

  function openGradeModal(section) {
    setGradeModal(section)
  }

  function closeGradeModal() {
    setGradeModal(null)
  }

  function getCombinedDistribution(distributions = []) {
    return distributions.reduce(
      (totals, distribution) => ({
        aCount: totals.aCount + Number(distribution.aCount || 0),
        bCount: totals.bCount + Number(distribution.bCount || 0),
        cCount: totals.cCount + Number(distribution.cCount || 0),
        dCount: totals.dCount + Number(distribution.dCount || 0),
        fCount: totals.fCount + Number(distribution.fCount || 0),
        total: totals.total + Number(distribution.total || 0),
      }),
      {
        aCount: 0,
        bCount: 0,
        cCount: 0,
        dCount: 0,
        fCount: 0,
        total: 0,
      }
    )
  }

  function closeConflictModal() {
    setConflictModal(null)
  }

  function closePrereqModal() {
    setPrereqModal(null)
  }

  function handleAddAnyway() {
    if (!prereqModal?.section) return

    addSectionWithoutPrereqCheck(prereqModal.section)
    setPrereqModal(null)
  }

  return (
    <>
      <div className="course-card">
        <div className="course-card-header">
          <span className="course-card-code">{course.courseCode}</span>
          <span className="course-card-dept">{course.department}</span>
        </div>

        <div className="course-card-title">{course.courseTitle}</div>
        <div className="course-card-units">{course.units} units</div>

        {typeof course.offeringCount === 'number' && (
          <div className="course-card-offerings">
            {course.offeringCount} offering{course.offeringCount === 1 ? '' : 's'} in selected term
          </div>
        )}

        {course.description && (
          <div className={`course-card-desc ${expanded ? 'expanded' : ''}`}>
            {expanded ? course.description : course.description.slice(0, 80)}
            {course.description.length > 80 && (
              <button
                type="button"
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

        {availableTerms.length > 0 && (
          <div className="course-card-terms">
            Available terms: {availableTerms.join(', ')}
          </div>
        )}

        {sections.length > 0 && (
          <div className="course-card-section-area">
            <button
              type="button"
              className="course-card-sections-toggle"
              onClick={() => setShowSections(!showSections)}
            >
              {showSections ? 'Hide sections' : `View ${sections.length} sections`}
            </button>

            {showSections && (
              <div className="course-card-sections">
                {sections.map(section => {
                  const selected = isSelected(section.id, section.term)

                  return (
                    <div key={section.id} className="course-section-row">
                      <div>
                        <div className="course-section-main">
                          Section {section.sectionCode} · Class #{section.classNumber}
                        </div>
                        <div className="course-section-meta">
                          {section.days || 'TBA'} · {section.times || 'TBA'} · {section.location || 'TBA'}
                        </div>
                        <div className="course-section-meta">
                          {section.instructor || 'Instructor TBA'} · {section.openSeats} open seats
                        </div>

                        {section.instructor &&
                          !section.instructor.toLowerCase().includes('tba') && (
                            <div className="course-section-rmp">
                              <a
                                href={`https://www.ratemyprofessors.com/search/professors/881?q=${encodeURIComponent(
                                  section.instructor
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Search professor on Rate My Professors ↗
                              </a>
                            </div>
                        )}

                        {section.gradeDistributions?.length > 0 && (
                          <div className="grade-distribution-area">
                            <button
                              type="button"
                              className="grade-distribution-toggle"
                              onClick={() => openGradeModal(section)}
                            >
                              View Grade Distribution
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className={selected ? 'section-remove-button' : 'section-add-button'}
                        onClick={() => {
                          if (selected) {
                            removeSection(section.id, section.term)
                          } else {
                            handleAddSection(section)
                          }
                        }}
                      >
                        {selected ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {gradeModal && (() => {
        const combined = getCombinedDistribution(
          gradeModal.gradeDistributions
        )

        const grades = [
          { grade: 'A', count: combined.aCount },
          { grade: 'B', count: combined.bCount },
          { grade: 'C', count: combined.cCount },
          { grade: 'D', count: combined.dCount },
          { grade: 'F', count: combined.fCount },
        ]

        return (
          <div
            className="grade-modal-backdrop"
            role="presentation"
            onClick={closeGradeModal}
          >
            <div
              className="grade-modal"
              role="dialog"
              aria-modal="true"
              onClick={event => event.stopPropagation()}
            >
              <div className="grade-modal-header">
                <div>
                  <h3>Grade Distribution</h3>

                  <div className="grade-modal-subtitle">
                    {course.courseCode} · {gradeModal.instructor || 'Instructor TBA'}
                  </div>
                </div>

                <button
                  type="button"
                  className="grade-modal-close"
                  onClick={closeGradeModal}
                  aria-label="Close grade distribution"
                >
                  ×
                </button>
              </div>

              <div className="grade-chart">
                {grades.map(item => {
                  const percentage =
                    combined.total > 0
                      ? (item.count / combined.total) * 100
                      : 0

                  return (
                    <div
                      className="grade-chart-row"
                      key={item.grade}
                    >
                      <div className="grade-chart-label">
                        {item.grade}
                      </div>

                      <div className="grade-chart-track">
                        <div
                          className="grade-chart-bar"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="grade-chart-value">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grade-modal-total">
                Based on {combined.total} grades
              </div>

              <div className="grade-history">
                <h4>Semester History</h4>

                {gradeModal.gradeDistributions.map(
                  (distribution, index) => (
                    <div
                      className="grade-history-row"
                      key={`${distribution.academicYear}-${distribution.semester}-${index}`}
                    >
                      <span>
                        {distribution.semester}
                        {distribution.academicYear
                          ? ` ${distribution.academicYear}`
                          : ''}
                      </span>

                      <span>
                        {distribution.total} grades
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {conflictModal && (
        <div className="section-conflict-backdrop" role="presentation">
          <div className="section-conflict-modal" role="dialog" aria-modal="true">
            <h3>Time conflict</h3>

            <p>
              <strong>{conflictModal.section.courseCode}</strong> conflicts with{' '}
              <strong>{conflictModal.conflict.courseCode}</strong>.
            </p>

            <div className="section-conflict-details">
              <div>
                <span>Trying to add</span>
                <strong>{conflictModal.section.courseCode}</strong>
                <p>
                  {conflictModal.section.days || 'TBA'} · {conflictModal.section.times || 'TBA'} · {conflictModal.section.location || 'TBA'}
                </p>
              </div>

              <div>
                <span>Already scheduled</span>
                <strong>{conflictModal.conflict.courseCode}</strong>
                <p>
                  {conflictModal.conflict.days || 'TBA'} · {conflictModal.conflict.times || 'TBA'} · {conflictModal.conflict.location || 'TBA'}
                </p>
              </div>
            </div>

            <div className="section-conflict-actions">
              <button
                type="button"
                className="section-conflict-primary"
                onClick={closeConflictModal}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {prereqModal && (
        <div className="section-conflict-backdrop" role="presentation">
          <div className="section-conflict-modal" role="dialog" aria-modal="true">
            <h3>Prerequisite/corequisite warning</h3>

            <p>
              <strong>{prereqModal.section.courseCode}</strong> may not satisfy all prerequisite or corequisite requirements for{' '}
              <strong>{prereqModal.section.term}</strong>.
            </p>

            <div className="section-conflict-details">
              {prereqModal.warnings.map(warning => (
                <div key={`${warning.courseId}-${warning.prereqCourseId}-${warning.prereqType}`}>
                  <span>
                    Missing {warning.prereqType === 'coreq' ? 'corequisite' : 'prerequisite'}
                  </span>
                  <strong>{warning.requiredCourseCode}</strong>
                  <p>
                    {warning.prereqType === 'coreq'
                      ? 'This course should be completed earlier or taken in the same semester.'
                      : 'This course should be completed in an earlier semester.'}
                  </p>
                </div>
              ))}
            </div>

            <div className="section-conflict-actions">
              <button
                type="button"
                className="section-conflict-secondary"
                onClick={closePrereqModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="section-conflict-primary"
                onClick={handleAddAnyway}
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CourseCard