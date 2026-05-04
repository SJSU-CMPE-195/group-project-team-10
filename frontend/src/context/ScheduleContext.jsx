import { useEffect, useState } from 'react'
import { ScheduleContext } from './scheduleContextObject'

const STORAGE_KEY = 'coursePlanner.schedulesByTerm'
const ACTIVE_TERM_KEY = 'coursePlanner.activeScheduleTerm'
const DEFAULT_TERM = 'spring 2026'

function normalizeTerm(term) {
  return term || DEFAULT_TERM
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedulesByTerm))
  }, [schedulesByTerm])

  useEffect(() => {
    localStorage.setItem(ACTIVE_TERM_KEY, activeTerm)
  }, [activeTerm])

  const selectedSections = schedulesByTerm[activeTerm] || []

  function addSection(section) {
    const term = normalizeTerm(section.term)

    setSchedulesByTerm((prev) => {
      const existingSections = prev[term] || []
      const alreadySelected = existingSections.some((item) => item.id === section.id)

      if (alreadySelected) return prev

      return {
        ...prev,
        [term]: [...existingSections, section],
      }
    })

    setActiveTerm(term)
  }

  function removeSection(sectionId, term = activeTerm) {
    setSchedulesByTerm((prev) => {
      const existingSections = prev[term] || []

      return {
        ...prev,
        [term]: existingSections.filter((section) => section.id !== sectionId),
      }
    })
  }

  function clearSchedule(term = activeTerm) {
    setSchedulesByTerm((prev) => ({
      ...prev,
      [term]: [],
    }))
  }

  function isSelected(sectionId, term) {
    const targetTerm = normalizeTerm(term)
    const existingSections = schedulesByTerm[targetTerm] || []

    return existingSections.some((section) => section.id === sectionId)
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
  }

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}