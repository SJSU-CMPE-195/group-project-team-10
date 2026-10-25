import { useEffect } from 'react'
import { act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { roadmapReducer, useRoadmap, useRoadmapDispatch } from './RoadmapContext'
import { persistRoadmapState } from './roadmapStorage'
import { buildTestRoadmapState, renderWithProviders } from '../test-utils'

function makeState(semesters, hasUnsavedChanges = false) {
  const base = { majorId: 1, semesters }
  return {
    ...base,
    prerequisites: [
      { courseId: 2, prereqCourseId: 1, prereqType: "prereq" },
      { courseId: 4, prereqCourseId: 1, prereqType: "prereq" },
    ],
    savedState: structuredClone(base),
    hasUnsavedChanges
  }
}

describe('roadmapReducer', () => {
  it('restores each major draft on top of that major default roadmap', () => {
    localStorage.clear()
    persistRoadmapState({
      majorId: 2,
      majorInfo: { majorId: 2 },
      semesters: [{
        semesterId: 9,
        term: 'Spring 2028',
        courses: [{ courseId: 22, status: 'completed', note: 'saved locally' }],
      }],
      courses: [{
        courseId: 22,
        courseCode: 'SWE 134',
        courseTitle: 'Software Engineering',
        units: 3,
      }],
      isLoadingRoadmap: false,
      hasUnsavedChanges: true,
    })

    const state = makeState([])
    const next = roadmapReducer(state, {
      type: 'SET_ROADMAP_DATA',
      roadmap: {
        major: {
          majorId: 2,
          majorName: 'Software Engineering, BS',
          department: 'SWE',
          totalRequiredUnits: 120,
        },
        courses: [{
          courseId: 21,
          courseCode: 'SWE 101',
          courseTitle: 'Intro',
          units: 3,
          department: 'SWE',
        }],
        prerequisites: [],
        degreeRequirements: [],
        semesters: [{
          semesterId: 1,
          term: 'Fall 2026',
          courses: [{ courseId: 21, status: 'planned', note: '' }],
        }],
      },
    })

    expect(next.majorId).toBe(2)
    expect(next.semesters[0].term).toBe('Spring 2028')
    expect(next.semesters[0].courses[0]).toMatchObject({
      courseId: 22,
      status: 'completed',
      note: 'saved locally',
    })
    expect(next.courses.map(course => course.courseId)).toEqual([21, 22])
    expect(next.hasUnsavedChanges).toBe(true)
  })

  describe('MARK_COURSE_FAILED', () => {
    it('sets the course status to failed', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      ])
      const next = roadmapReducer(state, { type: "MARK_COURSE_FAILED", courseId: 1 })
      expect(next.semesters[0].courses[0].status).toBe("failed")
      expect(next.hasUnsavedChanges).toBe(true)
    })

    it('cascades to block dependent planned courses', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
        { semesterId: 2, courses: [
          { courseId: 2, status: "planned" },  // depends on 1
          { courseId: 4, status: "planned" },  // depends on 1
        ]},
      ])
      const next = roadmapReducer(state, { type: "MARK_COURSE_FAILED", courseId: 1 })
      expect(next.semesters[1].courses[0].status).toBe("blocked")
      expect(next.semesters[1].courses[1].status).toBe("blocked")
    })
  })

  describe('MARK_COURSE_COMPLETED', () => {
    it('sets the course status to completed', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "in_progress" }] },
      ])
      const next = roadmapReducer(state, { type: "MARK_COURSE_COMPLETED", courseId: 1 })
      expect(next.semesters[0].courses[0].status).toBe("completed")
      expect(next.hasUnsavedChanges).toBe(true)
    })
  })

  describe('SET_COURSE_STATUS', () => {
    it('updates the course status', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "planned" }] },
      ])
      const next = roadmapReducer(state, {
        type: "SET_COURSE_STATUS", courseId: 1, status: "in_progress",
      })
      expect(next.semesters[0].courses[0].status).toBe("in_progress")
      expect(next.hasUnsavedChanges).toBe(true)
    })

    it('cascades to blocked downstream when status is failed', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
        { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
      ])
      const next = roadmapReducer(state, {
        type: "SET_COURSE_STATUS", courseId: 1, status: "failed",
      })
      expect(next.semesters[0].courses[0].status).toBe("failed")
      expect(next.semesters[1].courses[0].status).toBe("blocked")
    })
  })

  describe('ADD_GAP_SEMESTER', () => {
    it('inserts a gap semester after the specified semester', () => {
      const state = makeState([
        { semesterId: 1, term: "Fall 2024", courses: [{ courseId: 1, status: "completed" }] },
        { semesterId: 2, term: "Spring 2025", courses: [{ courseId: 2, status: "planned" }] },
      ])
      const next = roadmapReducer(state, { type: "ADD_GAP_SEMESTER", afterSemesterId: 1 })
      expect(next.semesters).toHaveLength(3)
      expect(next.semesters[1].courses).toEqual([])
      expect(next.semesters[1].term).toBe("Spring 2025")
      expect(next.hasUnsavedChanges).toBe(true)
    })

    it('returns unchanged state for invalid semester ID', () => {
      const state = makeState([
        { semesterId: 1, term: "Fall 2024", courses: [] },
      ])
      const next = roadmapReducer(state, { type: "ADD_GAP_SEMESTER", afterSemesterId: 99 })
      expect(next.semesters).toHaveLength(1)
    })
  })

  describe('REMOVE_SEMESTER', () => {
    it('removes the semester along with its courses', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1 }] },
        { semesterId: 2, courses: [{ courseId: 2 }] },
      ])
      const next = roadmapReducer(state, { type: "REMOVE_SEMESTER", semesterId: 2 })
      expect(next.semesters.map(s => s.semesterId)).toEqual([1])
      expect(next.hasUnsavedChanges).toBe(true)
    })

    it('keeps the last remaining semester', () => {
      const state = makeState([{ semesterId: 1, courses: [] }])
      expect(roadmapReducer(state, { type: "REMOVE_SEMESTER", semesterId: 1 })).toBe(state)
    })

    it('returns unchanged state for an unknown semester', () => {
      const state = makeState([{ semesterId: 1, courses: [] }, { semesterId: 2, courses: [] }])
      expect(roadmapReducer(state, { type: "REMOVE_SEMESTER", semesterId: 99 })).toBe(state)
    })
  })

  describe('MOVE_COURSE', () => {
    it('moves a course between semesters', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "planned" }] },
        { semesterId: 2, courses: [] },
      ])
      const next = roadmapReducer(state, {
        type: "MOVE_COURSE", courseId: 1, fromSemesterId: 1, toSemesterId: 2,
      })
      expect(next.semesters[0].courses).toHaveLength(0)
      expect(next.semesters[1].courses).toHaveLength(1)
      expect(next.semesters[1].courses[0].courseId).toBe(1)
      expect(next.hasUnsavedChanges).toBe(true)
    })

    it('returns unchanged state when from and to are the same', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "planned" }] },
      ])
      const next = roadmapReducer(state, {
        type: "MOVE_COURSE", courseId: 1, fromSemesterId: 1, toSemesterId: 1,
      })
      expect(next).toBe(state)
    })
  })

  describe('ADD_COURSE_TO_SEMESTER', () => {
    it('registers a course from outside the major so it can render', () => {
      const state = { ...makeState([{ semesterId: 1, courses: [] }]), courses: [] }
      const course = { courseId: 101, courseCode: "CS 46A", courseTitle: "Introduction to Programming", units: 4 }

      const next = roadmapReducer(state, { type: "ADD_COURSE_TO_SEMESTER", semesterId: 1, courseId: 101, course })

      expect(next.semesters[0].courses).toEqual([{ courseId: 101, status: "planned", note: "" }])
      expect(next.courses).toHaveLength(1)
      expect(next.courses[0]).toMatchObject({ courseId: 101, courseCode: "CS 46A", department: "CS" })
    })

    it('does not duplicate a course the roadmap already knows', () => {
      const known = { courseId: 1, courseCode: "CMPE 30", courseTitle: "Programming", units: 3 }
      const state = { ...makeState([{ semesterId: 1, courses: [] }]), courses: [known] }

      const next = roadmapReducer(state, { type: "ADD_COURSE_TO_SEMESTER", semesterId: 1, courseId: 1, course: known })

      expect(next.courses).toEqual([known])
    })
  })

  describe('SAVE_CHANGES', () => {
    it('saves current state and clears unsaved flag', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      ], true)
      const next = roadmapReducer(state, { type: "SAVE_CHANGES" })
      expect(next.hasUnsavedChanges).toBe(false)
      expect(next.savedState.semesters).toEqual(next.semesters)
    })
  })

  describe('DISCARD_CHANGES', () => {
    it('reverts to saved state', () => {
      const state = makeState([
        { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      ])
      // Make a change
      const changed = roadmapReducer(state, { type: "MARK_COURSE_FAILED", courseId: 1 })
      expect(changed.semesters[0].courses[0].status).toBe("failed")

      // Discard
      const reverted = roadmapReducer(changed, { type: "DISCARD_CHANGES" })
      expect(reverted.semesters[0].courses[0].status).toBe("completed")
      expect(reverted.hasUnsavedChanges).toBe(false)
    })
  })

  describe('RESET_ROADMAP', () => {
    it('resets to the saved roadmap state', () => {
      const state = {
        ...makeState([{ semesterId: 2, courses: [{ courseId: 2, status: "planned" }] }], true),
        savedState: {
          majorId: 1,
          semesters: [{ semesterId: 1, courses: [{ courseId: 1, status: "completed" }] }],
        },
      }
      const next = roadmapReducer(state, { type: "RESET_ROADMAP" })
      expect(next.semesters).toEqual(state.savedState.semesters)
      expect(next.hasUnsavedChanges).toBe(false)
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const state = makeState([])
      const next = roadmapReducer(state, { type: "UNKNOWN" })
      expect(next).toBe(state)
    })
  })
})

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('RoadmapProvider beforeunload guard', () => {

  it('asks the browser to confirm unload while there are unsaved changes', () => {
    renderWithProviders(<p>page</p>, {
      roadmapState: { ...buildTestRoadmapState(), hasUnsavedChanges: true },
    })

    expect(fireBeforeUnload().defaultPrevented).toBe(true)
  })

  it('lets the page unload when everything is saved', () => {
    renderWithProviders(<p>page</p>)

    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })
})

describe('RoadmapProvider autosave variant', () => {
  it('saves edits in the same dispatch', () => {
    const probe = {}
    function Probe() {
      const roadmap = useRoadmap()
      const dispatch = useRoadmapDispatch()
      useEffect(() => {
        probe.roadmap = roadmap
        probe.dispatch = dispatch
      })
      return null
    }

    renderWithProviders(<Probe />, { variant: 'autosave' })
    const before = probe.roadmap.semesters.length

    act(() => probe.dispatch({
      type: 'ADD_GAP_SEMESTER',
      afterSemesterId: probe.roadmap.semesters.at(-1).semesterId,
    }))

    expect(probe.roadmap.semesters).toHaveLength(before + 1)
    expect(probe.roadmap.savedState.semesters).toHaveLength(before + 1)
    expect(probe.roadmap.hasUnsavedChanges).toBe(false)
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })
})
