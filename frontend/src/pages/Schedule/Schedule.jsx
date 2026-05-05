import { useEffect, useMemo, useState } from 'react'
import { useRoadmap } from '../../context/RoadmapContext'
import { useSchedule } from '../../context/useSchedule'
import { fetchSections } from '../../api/sections'
import './Schedule.css'

const DAYS = ['M', 'T', 'W', 'R', 'F']
const DAY_LABELS = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  R: 'Thursday',
  F: 'Friday',
}

const CALENDAR_START_HOUR = 8
const CALENDAR_END_HOUR = 22
const HOUR_HEIGHT = 64

function normalizeTerm(term) {
  return (term || '').trim().toLowerCase()
}

function parseDays(days) {
  if (!days || days.includes('TBA')) return []

  const result = []
  for (const char of days.replace(/\s/g, '')) {
    if (DAYS.includes(char)) result.push(char)
  }
  return result
}

function parseTimeToMinutes(value) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
  if (!match) return null

  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3].toUpperCase()

  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  return hour * 60 + minute
}

function parseTimeRange(times) {
  if (!times || times.includes('TBA')) return null

  const parts = times.split('-')
  if (parts.length !== 2) return null

  const start = parseTimeToMinutes(parts[0])
  const end = parseTimeToMinutes(parts[1])

  if (start === null || end === null || end <= start) return null

  return { start, end }
}

function formatMinutes(minutes) {
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

function Schedule() {
  const roadmapState = useRoadmap()

  const {
    activeTerm,
    setActiveTerm,
    availableTerms,
    selectedSections,
    addSection,
    removeSection,
    clearSchedule,
    isSelected,
    findConflict,
  } = useSchedule()

  const [sections, setSections] = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [sectionsError, setSectionsError] = useState('')

  useEffect(() => {
    if (!activeTerm) return undefined

    let cancelled = false

    async function loadSectionsForTerm() {
      setSectionsLoading(true)
      setSectionsError('')

      try {
        const nextSections = await fetchSections(activeTerm)
        if (!cancelled) {
          setSections(nextSections)
        }
      } catch (error) {
        if (!cancelled) {
          setSections([])
          setSectionsError(error.message || 'Failed to load sections')
        }
      } finally {
        if (!cancelled) {
          setSectionsLoading(false)
        }
      }
    }

    loadSectionsForTerm()

    return () => {
      cancelled = true
    }
  }, [activeTerm])

  const roadmapCoursesForTerm = useMemo(() => {
    const semester = roadmapState.semesters.find(
      sem => normalizeTerm(sem.term) === normalizeTerm(activeTerm)
    )

    if (!semester) return []

    return semester.courses
      .map(plannedCourse => {
        const course = roadmapState.courses.find(
          item => item.courseId === plannedCourse.courseId
        )

        if (!course) return null

        return {
          ...course,
          roadmapStatus: plannedCourse.status,
          roadmapNote: plannedCourse.note,
        }
      })
      .filter(Boolean)
  }, [roadmapState.semesters, roadmapState.courses, activeTerm])

  const sectionsByCourseCode = useMemo(() => {
    return sections.reduce((map, section) => {
      const key = section.courseCode
      if (!map[key]) map[key] = []
      map[key].push(section)
      return map
    }, {})
  }, [sections])

  const scheduledBlocks = useMemo(() => {
    return selectedSections.flatMap(section => {
      const days = parseDays(section.days)
      const range = parseTimeRange(section.times)

      if (!days.length || !range) return []

      return days.map(day => ({
        ...section,
        day,
        start: range.start,
        end: range.end,
      }))
    })
  }, [selectedSections])

  const unscheduledSections = selectedSections.filter(section => {
    return parseDays(section.days).length === 0 || !parseTimeRange(section.times)
  })

  const minTime = CALENDAR_START_HOUR * 60
  const maxTime = CALENDAR_END_HOUR * 60
  const totalHours = CALENDAR_END_HOUR - CALENDAR_START_HOUR
  const calendarHeight = totalHours * HOUR_HEIGHT

  const roadmapPanel = (
    <section className="roadmap-schedule-panel">
      <div className="roadmap-schedule-panel-header">
        <div>
          <h3>Roadmap courses for {activeTerm}</h3>
          <p>Choose sections for the courses planned in your roadmap.</p>
        </div>
      </div>

      {sectionsError && (
        <div className="schedule-inline-error">{sectionsError}</div>
      )}

      {roadmapState.isLoadingRoadmap ? (
        <div className="schedule-empty">Loading roadmap courses...</div>
      ) : roadmapCoursesForTerm.length === 0 ? (
        <div className="schedule-empty">
          No courses are planned in Roadmap for {activeTerm}.
        </div>
      ) : (
        <div className="roadmap-course-section-list">
          {roadmapCoursesForTerm.map(course => {
            const courseSections = sectionsByCourseCode[course.courseCode] || []
            const selectedForCourse = selectedSections.find(
              section => section.courseCode === course.courseCode
            )

            return (
              <div key={course.courseId} className="roadmap-course-section-card">
                <div className="roadmap-course-section-info">
                  <strong>{course.courseCode}</strong>
                  <span>{course.courseTitle}</span>
                  {selectedForCourse && (
                    <small>
                      Selected: Section {selectedForCourse.sectionCode} · {selectedForCourse.days || 'TBA'} · {selectedForCourse.times || 'TBA'}
                    </small>
                  )}
                </div>

                {sectionsLoading ? (
                  <span className="schedule-section-loading">Loading sections...</span>
                ) : courseSections.length === 0 ? (
                  <span className="schedule-section-unavailable">No sections found</span>
                ) : (
                  <select
                    className="roadmap-section-select"
                    value={selectedForCourse?.id || ''}
                    onChange={(event) => {
                      const sectionId = Number(event.target.value)

                      if (!sectionId) {
                        if (selectedForCourse) {
                          removeSection(selectedForCourse.id, activeTerm)
                        }
                        return
                      }

                      const section = courseSections.find(item => item.id === sectionId)
                      if (!section) return

                      if (selectedForCourse && selectedForCourse.id !== section.id) {
                        removeSection(selectedForCourse.id, activeTerm)
                      }

                      if (!isSelected(section.id, section.term)) {
                        addSection(section)
                      }
                    }}
                  >
                    <option value="">Choose section</option>
                    {courseSections.map(section => {
                      const conflict = findConflict(section, activeTerm)

                      return (
                        <option
                          key={section.id}
                          value={section.id}
                          disabled={Boolean(conflict)}
                        >
                          {section.sectionCode} · {section.days || 'TBA'} · {section.times || 'TBA'} · {section.location || 'TBA'}
                          {conflict ? ` — conflicts with ${conflict.courseCode}` : ''}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div>
          <h2>Weekly Schedule</h2>
          <p>
            {selectedSections.length} selected section
            {selectedSections.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="schedule-actions">
          <label className="schedule-term-select-label">
            Semester
            <select
              className="schedule-term-select"
              value={activeTerm}
              onChange={(event) => setActiveTerm(event.target.value)}
            >
              {availableTerms.map(term => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
          </label>

          {selectedSections.length > 0 && (
            <button
              type="button"
              className="schedule-clear-button"
              onClick={() => clearSchedule(activeTerm)}
            >
              Clear schedule
            </button>
          )}
        </div>
      </div>

      {selectedSections.length === 0 ? (
        <div className="schedule-empty">
          Choose sections below to build your {activeTerm} weekly schedule.
        </div>
      ) : (
        <>
          <div className="schedule-grid">
            <div className="schedule-time-column">
              <div className="schedule-day-header-spacer" />
              {Array.from({ length: totalHours }, (_, index) => {
                const minutes = minTime + index * 60
                return (
                  <div
                    key={minutes}
                    className="schedule-time-label"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  >
                    {formatMinutes(minutes)}
                  </div>
                )
              })}
            </div>

            {DAYS.map(day => (
              <div key={day} className="schedule-day-column">
                <div className="schedule-day-header">{DAY_LABELS[day]}</div>

                <div
                  className="schedule-day-body"
                  style={{ height: `${calendarHeight}px` }}
                >
                  {scheduledBlocks
                    .filter(block => block.day === day)
                    .filter(block => block.end > minTime && block.start < maxTime)
                    .map(block => {
                      const top = ((Math.max(block.start, minTime) - minTime) / 60) * HOUR_HEIGHT
                      const height = ((Math.min(block.end, maxTime) - Math.max(block.start, minTime)) / 60) * HOUR_HEIGHT

                      return (
                        <div
                          key={`${block.id}-${day}`}
                          className="schedule-block"
                          style={{
                            top: `${top}px`,
                            height: `${Math.max(52, height)}px`,
                          }}
                        >
                          <button
                            type="button"
                            className="schedule-block-remove"
                            onClick={() => removeSection(block.id, activeTerm)}
                            aria-label={`Remove ${block.courseCode}`}
                          >
                            ×
                          </button>
                          <strong>{block.courseCode}</strong>
                          <span>{block.times}</span>
                          <span>{block.location}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>

          {unscheduledSections.length > 0 && (
            <section className="unscheduled-section-list">
              <h3>TBA / Online sections</h3>
              {unscheduledSections.map(section => (
                <div key={section.id} className="unscheduled-section-card">
                  <div>
                    <strong>{section.courseCode}</strong> · Section {section.sectionCode}
                    <p>{section.days || 'TBA'} · {section.times || 'TBA'} · {section.location}</p>
                  </div>
                  <button type="button" onClick={() => removeSection(section.id, activeTerm)}>
                    Remove
                  </button>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {roadmapPanel}
    </div>
  )
}

export default Schedule