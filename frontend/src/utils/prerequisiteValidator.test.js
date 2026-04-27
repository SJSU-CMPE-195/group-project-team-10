import { describe, it, expect } from 'vitest'
import { getPrerequisites, validateSemesterPlan, getBlockedCourses } from './prerequisiteValidator'

const samplePrereqs = [
  { courseId: 2, prereqCourseId: 1, prereqType: "prereq" },   // B requires A
  { courseId: 3, prereqCourseId: 2, prereqType: "prereq" },   // C requires B
  { courseId: 4, prereqCourseId: 1, prereqType: "prereq" },   // D requires A
  { courseId: 5, prereqCourseId: 2, prereqType: "coreq" },    // E coreq B
]

describe('getPrerequisites', () => {
  it('returns prerequisites for a course', () => {
    const result = getPrerequisites(2, samplePrereqs)
    expect(result).toEqual([{ courseId: 1, type: "prereq" }])
  })

  it('returns empty array for course with no prerequisites', () => {
    const result = getPrerequisites(1, samplePrereqs)
    expect(result).toEqual([])
  })

  it('returns corequisites with correct type', () => {
    const result = getPrerequisites(5, samplePrereqs)
    expect(result).toEqual([{ courseId: 2, type: "coreq" }])
  })

  it('returns multiple prerequisites', () => {
    const prereqs = [
      { courseId: 10, prereqCourseId: 1, prereqType: "prereq" },
      { courseId: 10, prereqCourseId: 2, prereqType: "prereq" },
    ]
    const result = getPrerequisites(10, prereqs)
    expect(result).toHaveLength(2)
  })

  it('handles empty prerequisite data', () => {
    const result = getPrerequisites(1, [])
    expect(result).toEqual([])
  })
})

describe('validateSemesterPlan', () => {
  it('returns no violations for a valid plan', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toEqual([])
  })

  it('detects missing prerequisite', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 2, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toEqual({
      courseId: 2,
      semesterId: 1,
      missingPrereqId: 1,
      type: "prereq",
    })
  })

  it('allows corequisite in same semester', () => {
    const semesters = [
      { semesterId: 1, courses: [
        { courseId: 2, status: "completed" },
        { courseId: 5, status: "planned" },
      ]},
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    // courseId 2 needs courseId 1 as prereq (violation), but courseId 5 coreq 2 is in same semester (ok)
    const coreqViolations = violations.filter(v => v.type === "coreq")
    expect(coreqViolations).toHaveLength(0)
  })

  it('detects missing corequisite', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 5, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    const coreqViolation = violations.find(v => v.type === "coreq")
    expect(coreqViolation).toBeDefined()
    expect(coreqViolation.missingPrereqId).toBe(2)
  })

  it('skips failed courses during validation', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 2, status: "failed" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toEqual([])
  })

  it('detects chain violations', () => {
    const semesters = [
      { semesterId: 1, courses: [
        { courseId: 3, status: "planned" },
      ]},
    ]
    // C requires B which requires A — both missing
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toHaveLength(1)
    expect(violations[0].missingPrereqId).toBe(2)
  })

  it('handles empty semesters', () => {
    const violations = validateSemesterPlan([], samplePrereqs)
    expect(violations).toEqual([])
  })

  it('handles semesters with no courses', () => {
    const semesters = [{ semesterId: 1, courses: [] }]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toEqual([])
  })

  it('does not flag prereq when planned in an earlier semester', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "planned" }] },
      { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations.filter(v => v.type === "prereq")).toEqual([])
  })

  it('flags prereq when planned in the same semester', () => {
    const semesters = [
      { semesterId: 1, courses: [
        { courseId: 1, status: "planned" },
        { courseId: 2, status: "planned" },
      ]},
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toContainEqual({
      courseId: 2, semesterId: 1, missingPrereqId: 1, type: "prereq",
    })
  })

  it('flags prereq when planned in a later semester', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 2, status: "planned" }] },
      { semesterId: 2, courses: [{ courseId: 1, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    expect(violations).toContainEqual({
      courseId: 2, semesterId: 1, missingPrereqId: 1, type: "prereq",
    })
  })

  it('flags coreq when planned in an earlier semester', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 2, status: "completed" }] },
      { semesterId: 2, courses: [{ courseId: 5, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    const coreqViolation = violations.find(v => v.type === "coreq")
    expect(coreqViolation).toBeDefined()
    expect(coreqViolation.missingPrereqId).toBe(2)
  })

  it('flags coreq when planned in a later semester', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 5, status: "planned" }] },
      { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
    ]
    const violations = validateSemesterPlan(semesters, samplePrereqs)
    const coreqViolation = violations.find(v => v.type === "coreq")
    expect(coreqViolation).toBeDefined()
    expect(coreqViolation.missingPrereqId).toBe(2)
  })
})

describe('getBlockedCourses', () => {
  it('finds directly blocked courses', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      { semesterId: 2, courses: [
        { courseId: 2, status: "planned" },
        { courseId: 4, status: "planned" },
      ]},
    ]
    const blocked = getBlockedCourses(1, semesters, samplePrereqs)
    expect(blocked).toContain(2)
    expect(blocked).toContain(4)
  })

  it('finds transitively blocked courses', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
      { semesterId: 3, courses: [{ courseId: 3, status: "planned" }] },
    ]
    const blocked = getBlockedCourses(1, semesters, samplePrereqs)
    expect(blocked).toContain(2)
    expect(blocked).toContain(3)
  })

  it('returns empty array when no courses are blocked', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
    ]
    const blocked = getBlockedCourses(99, semesters, samplePrereqs)
    expect(blocked).toEqual([])
  })

  it('does not include already completed courses', () => {
    const semesters = [
      { semesterId: 1, courses: [
        { courseId: 1, status: "completed" },
        { courseId: 2, status: "completed" },
      ]},
      { semesterId: 2, courses: [{ courseId: 3, status: "planned" }] },
    ]
    const blocked = getBlockedCourses(1, semesters, samplePrereqs)
    expect(blocked).not.toContain(2) // already completed, not blocked
    // course 3 depends on course 2 (completed), not directly on 1, so not blocked
    expect(blocked).not.toContain(3)
  })

  it('blocks planned courses in a chain through other planned courses', () => {
    const semesters = [
      { semesterId: 1, courses: [{ courseId: 1, status: "completed" }] },
      { semesterId: 2, courses: [{ courseId: 2, status: "planned" }] },
      { semesterId: 3, courses: [{ courseId: 3, status: "planned" }] },
    ]
    // Failing course 1 blocks planned course 2, which transitively blocks planned course 3
    const blocked = getBlockedCourses(1, semesters, samplePrereqs)
    expect(blocked).toContain(2)
    expect(blocked).toContain(3)
  })

  it('handles empty semesters', () => {
    const blocked = getBlockedCourses(1, [], samplePrereqs)
    expect(blocked).toEqual([])
  })
})
