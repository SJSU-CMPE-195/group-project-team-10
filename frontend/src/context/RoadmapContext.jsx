/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer } from 'react'
import sampleRoadmap from '../data/sampleRoadmap'
import prerequisites from '../data/prerequisites'
import { getBlockedCourses } from '../utils/prerequisiteValidator'

const RoadmapContext = createContext(null)
const RoadmapDispatchContext = createContext(null)

function buildInitialState() {
  return {
    ...structuredClone(sampleRoadmap),
    savedState: structuredClone(sampleRoadmap),
    hasUnsavedChanges: false,
  }
}

export function roadmapReducer(state, action) {
  switch (action.type) {
    case "MARK_COURSE_FAILED": {
      const blocked = getBlockedCourses(action.courseId, state.semesters, prerequisites)
      const blockedSet = new Set(blocked)
      const newSemesters = state.semesters.map(sem => ({
        ...sem,
        courses: sem.courses.map(c => {
          if (c.courseId === action.courseId) return { ...c, status: "failed" }
          if (blockedSet.has(c.courseId)) return { ...c, status: "blocked" }
          return c
        }),
      }))
      return { ...state, semesters: newSemesters, hasUnsavedChanges: true }
    }

    case "MARK_COURSE_COMPLETED": {
      const newSemesters = state.semesters.map(sem => ({
        ...sem,
        courses: sem.courses.map(c =>
          c.courseId === action.courseId ? { ...c, status: "completed" } : c
        ),
      }))
      return { ...state, semesters: newSemesters, hasUnsavedChanges: true }
    }

    case "ADD_GAP_SEMESTER": {
      const idx = state.semesters.findIndex(s => s.semesterId === action.afterSemesterId)
      if (idx === -1) return state

      const prevTerm = state.semesters[idx].term
      const [season, yearStr] = prevTerm.split(" ")
      const year = parseInt(yearStr)
      const newTerm = season === "Fall" ? `Spring ${year + 1}` : `Fall ${year}`

      const maxId = Math.max(...state.semesters.map(s => s.semesterId))
      const gapSemester = {
        semesterId: maxId + 1,
        term: newTerm,
        courses: [],
      }

      const newSemesters = [
        ...state.semesters.slice(0, idx + 1),
        gapSemester,
        ...state.semesters.slice(idx + 1),
      ]

      return { ...state, semesters: newSemesters, hasUnsavedChanges: true }
    }

    case 'MOVE_COURSE': {
      const { courseId, toSemesterId, toIndex } = action

      const newSemesters = state.semesters.map(sem => ({
        ...sem,
        courses: sem.courses.filter(c => c.courseId !== courseId)
      }))

      const targetSem = newSemesters.find(s => s.semesterId === toSemesterId)
      const course = state.semesters
      .flatMap(s => s.courses)
      .find(c => c.courseId === courseId)

      if (targetSem && course) {
        targetSem.courses.splice(toIndex ?? targetSem.courses.length, 0, course)
      }

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true
      }
    }

    case "ADD_COURSE_TO_SEMESTER": {
      const { semesterId, courseId, status = "planned" } = action

      // Prevent duplicates anywhere in the roadmap
      const alreadyExists = state.semesters.some(sem =>
        sem.courses.some(c => c.courseId === courseId)
      )
      if (alreadyExists) return state

      const newSemesters = state.semesters.map(sem => {
        if (sem.semesterId !== semesterId) return sem
        return {
          ...sem,
          courses: [...sem.courses, { courseId, status }],
        }
      })

      return { ...state, semesters: newSemesters, hasUnsavedChanges: true }
    }

    case "REMOVE_COURSE_FROM_SEMESTER": {
      const { semesterId, courseId } = action

      const newSemesters = state.semesters.map(sem => {
        if (sem.semesterId !== semesterId) return sem
        return {
          ...sem,
          courses: sem.courses.filter(c => c.courseId !== courseId),
        }
      })

      return { ...state, semesters: newSemesters, hasUnsavedChanges: true }
    }

    case "SAVE_CHANGES": {
      return {
        ...state,
        savedState: { majorId: state.majorId, semesters: structuredClone(state.semesters) },
        hasUnsavedChanges: false,
      }
    }

    case "DISCARD_CHANGES": {
      return {
        ...state,
        majorId: state.savedState.majorId,
        semesters: structuredClone(state.savedState.semesters),
        hasUnsavedChanges: false,
      }
    }

    case "RESET_ROADMAP": {
      return buildInitialState()
    }

    default:
      return state
  }
}

export function RoadmapProvider({ children }) {
  const [state, dispatch] = useReducer(roadmapReducer, null, buildInitialState)

  return (
    <RoadmapContext.Provider value={state}>
      <RoadmapDispatchContext.Provider value={dispatch}>
        {children}
      </RoadmapDispatchContext.Provider>
    </RoadmapContext.Provider>
  )
}

export function useRoadmap() {
  const context = useContext(RoadmapContext)
  if (context === null) throw new Error("useRoadmap must be used within RoadmapProvider")
  return context
}

export function useRoadmapDispatch() {
  const context = useContext(RoadmapDispatchContext)
  if (context === null) throw new Error("useRoadmapDispatch must be used within RoadmapProvider")
  return context
}
