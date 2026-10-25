import { beforeEach, describe, expect, it } from 'vitest'
import {
  getRoadmapDraft,
  getSavedSelectedMajorId,
  persistRoadmapState,
  readRoadmapStorage,
} from './roadmapStorage'

const STORAGE_KEY = 'coursePlanner.roadmapDrafts'

describe('roadmapStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists customized drafts separately for each major', () => {
    const state = (majorId, courseId, status) => ({
      majorId,
      majorInfo: { majorId },
      semesters: [{
        semesterId: 1,
        term: 'Fall 2026',
        courses: [{ courseId, status, note: 'local plan' }],
      }],
      courses: [{
        courseId,
        courseCode: `TST ${courseId}`,
        courseTitle: 'Test Course',
        units: 3,
      }],
      isLoadingRoadmap: false,
      hasUnsavedChanges: true,
    })

    expect(persistRoadmapState(state(10, 100, 'completed'))).toBe(true)
    expect(persistRoadmapState(state(20, 200, 'planned'))).toBe(true)

    expect(getSavedSelectedMajorId()).toBe(20)
    expect(getRoadmapDraft(10).semesters[0].courses[0].status).toBe('completed')
    expect(getRoadmapDraft(20).semesters[0].courses[0].courseId).toBe(200)
  })

  it('recovers safely from malformed and outdated storage', () => {
    window.localStorage.setItem(STORAGE_KEY, '{invalid json')
    expect(readRoadmapStorage()).toMatchObject({ version: 1, selectedMajorId: null, byMajor: {} })

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 99,
      selectedMajorId: 10,
      byMajor: {},
    }))
    expect(readRoadmapStorage()).toMatchObject({ version: 1, selectedMajorId: null, byMajor: {} })
  })

  it('does not overwrite a saved roadmap while the API is loading', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      selectedMajorId: 10,
      byMajor: {
        10: {
          majorId: 10,
          semesters: [{
            semesterId: 1,
            term: 'Fall 2026',
            courses: [{ courseId: 100, status: 'completed', note: '' }],
          }],
          courses: [{ courseId: 100, courseCode: 'TST 100', courseTitle: 'Test Course' }],
          hasUnsavedChanges: true,
        },
      },
    }))

    expect(persistRoadmapState({
      majorId: '',
      majorInfo: null,
      semesters: [],
      courses: [],
      isLoadingRoadmap: true,
      hasUnsavedChanges: false,
    })).toBe(false)
    expect(getRoadmapDraft(10).semesters[0].courses[0].status).toBe('completed')
  })
})
