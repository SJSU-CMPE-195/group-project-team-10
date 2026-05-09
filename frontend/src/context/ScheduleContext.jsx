import { useEffect, useState } from 'react'
import { ScheduleContext } from './scheduleContextObject'

const STORAGE_KEY = 'coursePlanner.schedulesByTerm'
const ACTIVE_TERM_KEY = 'coursePlanner.activeScheduleTerm'
const DEFAULT_TERM = 'spring 2026'

function normalizeTerm(term) {
  return term || DEFAULT_TERM
}

function parseDays(days = '') {
  if (!days || days.includes('TBA')) return []
  return days.replace(/\s/g, '').split('')
}

function parseTimeToMinutes(value = '') {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(AM|PM)$/i)
  if (!match) return null

  let hour = Number(match[1])
  const minute = Number(match[2])
  const period = match[3].toUpperCase()

  if (period === 'PM' && hour !== 12) hour += 12
  if (period === 'AM' && hour === 12) hour = 0

  return hour * 60 + minute
}

function parseTimeRange(times = '') {
  if (!times || times.includes('TBA')) return null

  const parts = times.split('-')
  if (parts.length !== 2) return null

  const start = parseTimeToMinutes(parts[0])
  const end = parseTimeToMinutes(parts[1])

  if (start === null || end === null || end <= start) return null

  return { start, end }
}

function sectionsConflict(firstSection, secondSection) {
  if (!firstSection || !secondSection) return false

  const firstDays = parseDays(firstSection.days)
  const secondDays = parseDays(secondSection.days)

  const hasSharedDay = firstDays.some(day => secondDays.includes(day))
  if (!hasSharedDay) return false

  const firstTime = parseTimeRange(firstSection.times)
  const secondTime = parseTimeRange(secondSection.times)

  if (!firstTime || !secondTime) return false

  return firstTime.start < secondTime.end && secondTime.start < firstTime.end
}

export function ScheduleProvider({ children }) {
  const [schedulesByTerm, setSchedulesByTerm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [activeTerm, setActiveTerm] = useState(() => {
    return localStorage.getItem(ACTIVE_TERM_KEY) || DEFAULT_TERM
  })

  const [scheduleError, setScheduleError] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedulesByTerm))
  }, [schedulesByTerm])

  useEffect(() => {
    localStorage.setItem(ACTIVE_TERM_KEY, activeTerm)
  }, [activeTerm])

  const selectedSections = schedulesByTerm[activeTerm] || []

  function addSection(section) {
    const term = normalizeTerm(section.term)
    const existingSections = schedulesByTerm[term] || []

    const alreadySelected = existingSections.some(item => item.id === section.id)
    if (alreadySelected) {
      setScheduleError('')
      setActiveTerm(term)
      return { ok: true }
    }

    const sectionsWithoutSameCourse = existingSections.filter(
      existing => existing.courseCode !== section.courseCode
    )

    const conflictingSection = sectionsWithoutSameCourse.find(existing =>
      sectionsConflict(existing, section)
    )

    if (conflictingSection) {
      const message =
        `${section.courseCode} conflicts with ${conflictingSection.courseCode} ` +
        `(${conflictingSection.days || 'TBA'} ${conflictingSection.times || 'TBA'})`

      setScheduleError(message)

      return {
        ok: false,
        message,
        conflict: conflictingSection,
      }
    }

    setSchedulesByTerm(prev => ({
      ...prev,
      [term]: [...sectionsWithoutSameCourse, section],
    }))

    setScheduleError('')
    setActiveTerm(term)

    return { ok: true }
  }

  function removeSection(sectionId, term = activeTerm) {
    setSchedulesByTerm(prev => {
      const existingSections = prev[term] || []

      return {
        ...prev,
        [term]: existingSections.filter(section => section.id !== sectionId),
      }
    })

    setScheduleError('')
  }

  function clearSchedule(term = activeTerm) {
    setSchedulesByTerm(prev => ({
      ...prev,
      [term]: [],
    }))

    setScheduleError('')
  }

  function clearScheduleError() {
    setScheduleError('')
  }

  function isSelected(sectionId, term) {
    const targetTerm = normalizeTerm(term)
    const existingSections = schedulesByTerm[targetTerm] || []

    return existingSections.some(section => section.id === sectionId)
  }

  function findConflict(section, term = activeTerm) {
    const targetTerm = normalizeTerm(term)
    const existingSections = schedulesByTerm[targetTerm] || []

    return existingSections
      .filter(existing => existing.courseCode !== section.courseCode)
      .find(existing => sectionsConflict(existing, section))
  }

  const termsFromSchedules = Object.keys(schedulesByTerm)
  const defaultTerms = ['spring 2026', 'fall 2026']
  const availableTerms = Array.from(new Set([...defaultTerms, ...termsFromSchedules]))

  const value = {
    activeTerm,
    setActiveTerm,
    availableTerms,
    schedulesByTerm,
    selectedSections,
    addSection,
    removeSection,
    clearSchedule,
    isSelected,
    scheduleError,
    clearScheduleError,
    findConflict,
    sectionsConflict,
  }

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}