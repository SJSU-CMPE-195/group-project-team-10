import { useEffect, useMemo, useState } from 'react'
import { ScheduleContext } from './scheduleContextObject'

const STORAGE_KEY = 'coursePlanner.selectedSections'

export function ScheduleProvider({ children }) {
  const [selectedSections, setSelectedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSections))
  }, [selectedSections])

  function addSection(section) {
    setSelectedSections((prev) => {
      const alreadySelected = prev.some((item) => item.id === section.id)
      if (alreadySelected) return prev
      return [...prev, section]
    })
  }

  function removeSection(sectionId) {
    setSelectedSections((prev) => (
      prev.filter((section) => section.id !== sectionId)
    ))
  }

  function clearSchedule() {
    setSelectedSections([])
  }

  const value = useMemo(() => {
    function isSelected(sectionId) {
      return selectedSections.some((section) => section.id === sectionId)
    }

    return {
      selectedSections,
      addSection,
      removeSection,
      clearSchedule,
      isSelected,
    }
  }, [selectedSections])

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}