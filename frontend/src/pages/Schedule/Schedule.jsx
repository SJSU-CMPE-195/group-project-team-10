import { useMemo } from 'react'
import { useSchedule } from '../../context/useSchedule'
import './Schedule.css'

const DAYS = ['M', 'T', 'W', 'R', 'F']
const DAY_LABELS = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  R: 'Thursday',
  F: 'Friday',
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
  const {
    activeTerm,
    setActiveTerm,
    availableTerms,
    selectedSections,
    removeSection,
    clearSchedule,
  } = useSchedule()

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

  const minTime = 8 * 60
  const maxTime = 22 * 60
  const totalMinutes = maxTime - minTime

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div>
          <h2>Weekly Schedule</h2>
          <p>{selectedSections.length} selected section{selectedSections.length === 1 ? '' : 's'}</p>
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
          Add sections from the Catalog to build your {activeTerm} weekly schedule.
        </div>
      ) : (
        <>
          <div className="schedule-grid">
            <div className="schedule-time-column">
              <div className="schedule-day-header-spacer" />
              {Array.from({ length: 15 }, (_, index) => {
                const minutes = minTime + index * 60
                return (
                  <div key={minutes} className="schedule-time-label">
                    {formatMinutes(minutes)}
                  </div>
                )
              })}
            </div>

            {DAYS.map(day => (
              <div key={day} className="schedule-day-column">
                <div className="schedule-day-header">{DAY_LABELS[day]}</div>

                <div className="schedule-day-body">
                  {scheduledBlocks
                    .filter(block => block.day === day)
                    .map(block => {
                      const top = ((block.start - minTime) / totalMinutes) * 100
                      const height = ((block.end - block.start) / totalMinutes) * 100

                      return (
                        <div
                          key={`${block.id}-${day}`}
                          className="schedule-block"
                          style={{
                            top: `${Math.max(0, top)}%`,
                            height: `${Math.max(5, height)}%`,
                          }}
                        >
                          <strong>{block.courseCode}</strong>
                          <span>{block.times}</span>
                          <span>{block.location}</span>
                          <button type="button" onClick={() => removeSection(block.id, activeTerm)}>
                            Remove
                          </button>
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
    </div>
  )
}

export default Schedule