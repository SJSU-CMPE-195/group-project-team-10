/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react'
import { fetchMajors, fetchRoadmapByMajor } from '../api/roadmap'
import { getBlockedCourses } from '../utils/prerequisiteValidator'

const RoadmapContext = createContext(null)
const RoadmapDispatchContext = createContext(null)

const SELECTED_MAJOR_KEY = 'coursePlanner.selectedMajorId'

function buildInitialState(initialState) {
  if (initialState) return initialState

  return {
    majorId: '',
    semesters: [],
    majors: [],
    majorInfo: null,
    courses: [],
    prerequisites: [],
    degreeRequirements: [],
    isLoadingRoadmap: true,
    roadmapError: '',
    savedState: { majorId: '', semesters: [] },
    hasUnsavedChanges: false,
  }
}

function normalizeTerm(term) {
  return (term || '').trim().toLowerCase()
}

function toDisplayTerm(term) {
  return (term || '')
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function applyFailCascade(semesters, courseId, prereqData = []) {
  const blockedSet = new Set(getBlockedCourses(courseId, semesters, prereqData))

  return semesters.map(sem => ({
    ...sem,
    courses: sem.courses.map(c => {
      if (c.courseId === courseId) return { ...c, status: 'failed' }
      if (blockedSet.has(c.courseId)) return { ...c, status: 'blocked' }
      return c
    }),
  }))
}

function setCourseStatus(semesters, courseId, status) {
  return semesters.map(sem => ({
    ...sem,
    courses: sem.courses.map(c =>
      c.courseId === courseId ? { ...c, status } : c
    ),
  }))
}

function getSavedSelectedMajorId() {
  const value = localStorage.getItem(SELECTED_MAJOR_KEY)
  if (!value) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function saveSelectedMajorId(majorId) {
  if (majorId === null || majorId === undefined || majorId === '') return
  localStorage.setItem(SELECTED_MAJOR_KEY, String(majorId))
}

export function roadmapReducer(state, action) {
  switch (action.type) {
    case 'MARK_COURSE_FAILED': {
      return {
        ...state,
        semesters: applyFailCascade(state.semesters, action.courseId, state.prerequisites),
        hasUnsavedChanges: true,
      }
    }

    case 'MARK_COURSE_COMPLETED': {
      return {
        ...state,
        semesters: setCourseStatus(state.semesters, action.courseId, 'completed'),
        hasUnsavedChanges: true,
      }
    }

    case 'SET_COURSE_STATUS': {
      const { courseId, status } = action

      const newSemesters = status === 'failed'
        ? applyFailCascade(state.semesters, courseId, state.prerequisites)
        : setCourseStatus(state.semesters, courseId, status)

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'SET_ROADMAP_LOADING': {
      return {
        ...state,
        isLoadingRoadmap: true,
        roadmapError: '',
      }
    }

    case 'SET_ROADMAP_ERROR': {
      return {
        ...state,
        isLoadingRoadmap: false,
        roadmapError: action.error || 'Unable to load roadmap data.',
      }
    }

    case 'SET_MAJORS': {
      return {
        ...state,
        majors: action.majors,
      }
    }

    case 'SET_ROADMAP_DATA': {
      const nextRoadmap = {
        majorId: action.roadmap.major.majorId,
        semesters: structuredClone(action.roadmap.semesters),
      }

      saveSelectedMajorId(action.roadmap.major.majorId)

      return {
        ...state,
        majorId: action.roadmap.major.majorId,
        majorInfo: {
          majorId: action.roadmap.major.majorId,
          majorName: action.roadmap.major.majorName,
          department: action.roadmap.major.department,
          totalRequiredUnits: action.roadmap.major.totalRequiredUnits,
        },
        courses: structuredClone(action.roadmap.courses),
        prerequisites: structuredClone(action.roadmap.prerequisites),
        degreeRequirements: structuredClone(action.roadmap.degreeRequirements),
        semesters: structuredClone(action.roadmap.semesters),
        savedState: nextRoadmap,
        hasUnsavedChanges: false,
        isLoadingRoadmap: false,
        roadmapError: '',
      }
    }

    case 'ADD_GAP_SEMESTER': {
      const idx = state.semesters.findIndex(s => s.semesterId === action.afterSemesterId)
      if (idx === -1) return state

      const prevTerm = state.semesters[idx].term
      const [season, yearStr] = prevTerm.split(' ')
      const year = parseInt(yearStr, 10)
      const newTerm = season === 'Fall' ? `Spring ${year + 1}` : `Fall ${year}`

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

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'MOVE_COURSE': {
      const { courseId, toSemesterId, toIndex } = action

      let fromSemesterId = null
      let currentIndex = -1

      for (const sem of state.semesters) {
        const idx = sem.courses.findIndex(c => c.courseId === courseId)

        if (idx !== -1) {
          fromSemesterId = sem.semesterId
          currentIndex = idx
          break
        }
      }

      if (fromSemesterId == null) return state

      if (
        fromSemesterId === toSemesterId &&
        (toIndex === currentIndex || toIndex == null)
      ) {
        return state
      }

      const newSemesters = state.semesters.map(sem => ({
        ...sem,
        courses: sem.courses.filter(c => c.courseId !== courseId),
      }))

      const targetSem = newSemesters.find(s => s.semesterId === toSemesterId)

      const course = state.semesters
        .flatMap(s => s.courses)
        .find(c => c.courseId === courseId)

      if (!targetSem || !course) return state

      const insertIndex =
        toIndex >= 0 && toIndex <= targetSem.courses.length
          ? toIndex
          : targetSem.courses.length

      targetSem.courses.splice(insertIndex, 0, course)

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'ADD_COURSE_TO_SEMESTER': {
      const { semesterId, courseId, status = 'planned' } = action

      const alreadyExists = state.semesters.some(sem =>
        sem.courses.some(c => c.courseId === courseId)
      )

      if (alreadyExists) return state

      const newSemesters = state.semesters.map(sem => {
        if (sem.semesterId !== semesterId) return sem

        return {
          ...sem,
          courses: [...sem.courses, { courseId, status, note: '' }],
        }
      })

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'REMOVE_COURSE_FROM_SEMESTER': {
      const { semesterId, courseId } = action

      const newSemesters = state.semesters.map(sem => {
        if (sem.semesterId !== semesterId) return sem

        return {
          ...sem,
          courses: sem.courses.filter(c => c.courseId !== courseId),
        }
      })

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'SET_COURSE_NOTE': {
      const { semesterId, courseId, note } = action

      const newSemesters = state.semesters.map(sem => {
        if (sem.semesterId !== semesterId) return sem

        return {
          ...sem,
          courses: sem.courses.map(c =>
            c.courseId === courseId ? { ...c, note } : c
          ),
        }
      })

      return {
        ...state,
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'APPLY_SCHEDULE_TO_ROADMAP': {
      const { term, courses } = action
      const targetTerm = normalizeTerm(term)

      if (!targetTerm || !courses?.length) return state

      let newSemesters = state.semesters.map(semester => ({
        ...semester,
        courses: [...semester.courses],
      }))

      let targetSemester = newSemesters.find(
        semester => normalizeTerm(semester.term) === targetTerm
      )

      if (!targetSemester) {
        const maxSemesterId = newSemesters.length > 0
          ? Math.max(...newSemesters.map(semester => semester.semesterId))
          : 0

        targetSemester = {
          semesterId: maxSemesterId + 1,
          term: toDisplayTerm(term),
          courses: [],
        }

        newSemesters = [...newSemesters, targetSemester]
      }

      const existingCatalogCourseIds = new Set(
        state.courses.map(course => course.courseId)
      )

      const coursesToAddToCatalogState = courses
        .filter(course => course.courseId && !existingCatalogCourseIds.has(course.courseId))
        .map(course => ({
          courseId: course.courseId,
          courseCode: course.courseCode,
          courseTitle: course.courseTitle || course.title || course.courseCode,
          units: course.units || 0,
          department: course.department || course.courseCode?.split(' ')[0] || '',
          description: course.description || '',
        }))

      let didChangeRoadmap = false

      for (const course of courses) {
        if (!course.courseId) continue

        let existingRoadmapCourse = null
        let existingSemesterId = null

        for (const semester of newSemesters) {
          const match = semester.courses.find(item => item.courseId === course.courseId)

          if (match) {
            existingRoadmapCourse = match
            existingSemesterId = semester.semesterId
            break
          }
        }

        if (existingSemesterId === targetSemester.semesterId) {
          continue
        }

        newSemesters = newSemesters.map(semester => ({
          ...semester,
          courses: semester.courses.filter(item => item.courseId !== course.courseId),
        }))

        newSemesters = newSemesters.map(semester => {
          if (semester.semesterId !== targetSemester.semesterId) return semester

          return {
            ...semester,
            courses: [
              ...semester.courses,
              existingRoadmapCourse || {
                courseId: course.courseId,
                status: 'planned',
                note: '',
              },
            ],
          }
        })

        didChangeRoadmap = true
      }

      if (!didChangeRoadmap && coursesToAddToCatalogState.length === 0) {
        return state
      }

      return {
        ...state,
        courses: [...state.courses, ...coursesToAddToCatalogState],
        semesters: newSemesters,
        hasUnsavedChanges: true,
      }
    }

    case 'SAVE_CHANGES': {
      return {
        ...state,
        savedState: {
          majorId: state.majorId,
          semesters: structuredClone(state.semesters),
        },
        hasUnsavedChanges: false,
      }
    }

    case 'DISCARD_CHANGES': {
      return {
        ...state,
        majorId: state.savedState.majorId,
        semesters: structuredClone(state.savedState.semesters),
        hasUnsavedChanges: false,
      }
    }

    case 'RESET_ROADMAP': {
      return {
        ...state,
        majorId: state.savedState.majorId,
        semesters: structuredClone(state.savedState.semesters),
        hasUnsavedChanges: false,
      }
    }

    default:
      return state
  }
}

export function RoadmapProvider({ children, initialState, disableAutoLoad = false }) {
  const [state, dispatch] = useReducer(roadmapReducer, initialState, buildInitialState)

  useEffect(() => {
    if (disableAutoLoad) return undefined

    let cancelled = false

    async function loadInitialRoadmap() {
      dispatch({ type: 'SET_ROADMAP_LOADING' })

      try {
        const loadedMajors = await fetchMajors()
        if (cancelled) return

        dispatch({ type: 'SET_MAJORS', majors: loadedMajors })

        const savedMajorId = getSavedSelectedMajorId()
        const savedMajorExists = loadedMajors.some(
          major => major.majorId === savedMajorId
        )

        const initialMajorId = savedMajorExists
          ? savedMajorId
          : loadedMajors[0]?.majorId

        if (!initialMajorId) {
          dispatch({
            type: 'SET_ROADMAP_ERROR',
            error: 'No imported majors were found in the database.',
          })
          return
        }

        const roadmap = await fetchRoadmapByMajor(initialMajorId)

        if (!cancelled) {
          dispatch({ type: 'SET_ROADMAP_DATA', roadmap })
        }
      } catch (error) {
        if (!cancelled) {
          dispatch({ type: 'SET_ROADMAP_ERROR', error: error.message })
        }
      }
    }

    loadInitialRoadmap()

    return () => {
      cancelled = true
    }
  }, [disableAutoLoad])

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

  if (context === null) {
    throw new Error('useRoadmap must be used within RoadmapProvider')
  }

  return context
}

export function useRoadmapDispatch() {
  const context = useContext(RoadmapDispatchContext)

  if (context === null) {
    throw new Error('useRoadmapDispatch must be used within RoadmapProvider')
  }

  return context
}