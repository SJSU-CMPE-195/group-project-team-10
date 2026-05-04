import { useState } from 'react'
import { courseMap } from '../../data/courses'
import { useSchedule } from '../../context/useSchedule'
import './CourseCard.css'

function CourseCard({ course, prereqs, sections = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const { addSection, removeSection, isSelected } = useSchedule()
  const availableTerms = course.availableTerms || []

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
                const selected = isSelected(section.id)

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
                      onClick={() => selected ? removeSection(section.id) : addSection(section)}
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
  )
}

export default CourseCard