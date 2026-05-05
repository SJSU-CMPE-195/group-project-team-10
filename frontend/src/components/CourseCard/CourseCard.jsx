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
  const [conflictModal, setConflictModal] = useState(null)
  const [prereqModal, setPrereqModal] = useState(null)

  const roadmapState = useRoadmap()
  const { addSection, removeSection, isSelected, findConflict } = useSchedule()
  const availableTerms = course.availableTerms || []

  const prereqNames = prereqs.map(p => {
    const c = courseMap.get(p.prereqCourseId)
    return c ? c.courseCode : `Course ${p.prereqCourseId}`
  })

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
    const conflict = findConflict(section, section.term)

    if (conflict) {
      setConflictModal({
        section,
        conflict,
      })
      return
    }

    const warnings = getPrereqWarnings({
      course,
      section,
      roadmapState,
    })

    if (warnings.length > 0) {
      setPrereqModal({
        section,
        warnings,
      })
      return
    }

    addSectionWithoutPrereqCheck(section)
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