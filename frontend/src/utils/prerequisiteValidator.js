/**
 * Returns prerequisite course IDs for a given course.
 */
export function getPrerequisites(courseId, prereqData) {
  return prereqData
    .filter(p => p.courseId === courseId)
    .map(p => ({ courseId: p.prereqCourseId, type: p.prereqType }))
}

/**
 * Validates a semester plan against prerequisite requirements.
 * Returns an array of violation objects.
 */
export function validateSemesterPlan(semesters, prereqData) {
  const violations = []
  const plannedBefore = new Set()
  const inSameSemester = new Set()

  const prereqIndex = new Map()
  for (const p of prereqData) {
    if (!prereqIndex.has(p.courseId)) prereqIndex.set(p.courseId, [])
    prereqIndex.get(p.courseId).push(p)
  }

  for (const semester of semesters) {
    inSameSemester.clear()
    for (const course of semester.courses) {
      inSameSemester.add(course.courseId)
    }

    for (const course of semester.courses) {
      if (course.status === "failed") continue

      const prereqs = prereqIndex.get(course.courseId) || []

      for (const prereq of prereqs) {
        if (prereq.prereqType === "prereq") {
          if (!plannedBefore.has(prereq.prereqCourseId)) {
            violations.push({
              courseId: course.courseId,
              semesterId: semester.semesterId,
              missingPrereqId: prereq.prereqCourseId,
              type: "prereq",
            })
          }
        } else if (prereq.prereqType === "coreq") {
          if (!inSameSemester.has(prereq.prereqCourseId)) {
            violations.push({
              courseId: course.courseId,
              semesterId: semester.semesterId,
              missingPrereqId: prereq.prereqCourseId,
              type: "coreq",
            })
          }
        }
      }
    }

    for (const course of semester.courses) {
      plannedBefore.add(course.courseId)
    }
  }

  return violations
}

/**
 * Given a failed course, finds all downstream courses that are now blocked.
 * Uses BFS traversal of the prerequisite DAG.
 */
export function getBlockedCourses(failedCourseId, semesters, prereqData) {
  const allPlannedCourseIds = new Set()
  for (const sem of semesters) {
    for (const c of sem.courses) {
      if (c.status === "planned" || c.status === "in_progress") {
        allPlannedCourseIds.add(c.courseId)
      }
    }
  }

  // Build reverse adjacency: courseId -> courses that depend on it
  const dependents = new Map()
  for (const p of prereqData) {
    if (!dependents.has(p.prereqCourseId)) {
      dependents.set(p.prereqCourseId, [])
    }
    dependents.get(p.prereqCourseId).push(p.courseId)
  }

  const blocked = new Set()
  const queue = [failedCourseId]

  while (queue.length > 0) {
    const current = queue.shift()
    const deps = dependents.get(current) || []
    for (const dep of deps) {
      if (!blocked.has(dep) && allPlannedCourseIds.has(dep)) {
        blocked.add(dep)
        queue.push(dep)
      }
    }
  }

  return [...blocked]
}
