import { describe, it, expect } from 'vitest'
import { roadmapReducer } from './RoadmapContext'

function makeState(semesters, hasUnsavedChanges = false) {
  const base = { majorId: 1, semesters }
  return { ...base, savedState: structuredClone(base), hasUnsavedChanges }
}

describe('roadmapReducer', () => {
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
    it('resets to initial sample roadmap', () => {
      const state = makeState([])
      const next = roadmapReducer(state, { type: "RESET_ROADMAP" })
      expect(next.semesters.length).toBeGreaterThan(0)
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
