const STORAGE_KEY = 'coursePlanner.roadmapDrafts'
const STORAGE_VERSION = 1
const COURSE_STATUSES = new Set(['planned', 'in_progress', 'completed', 'failed', 'blocked'])

function emptyStorage() {
  return { version: STORAGE_VERSION, selectedMajorId: null, byMajor: {} }
}

function validCourse(course) {
  return course &&
    Number.isInteger(Number(course.courseId)) &&
    Number(course.courseId) > 0 &&
    typeof course.courseCode === 'string' &&
    typeof course.courseTitle === 'string'
}

function validSemesters(semesters) {
  if (!Array.isArray(semesters)) return false
  const semesterIds = new Set()
  const courseIds = new Set()

  return semesters.every(semester => {
    if (!semester || !Number.isInteger(Number(semester.semesterId)) ||
      typeof semester.term !== 'string' || !Array.isArray(semester.courses) ||
      semesterIds.has(Number(semester.semesterId))) return false
    semesterIds.add(Number(semester.semesterId))

    return semester.courses.every(course => {
      const courseId = Number(course?.courseId)
      if (!Number.isInteger(courseId) || courseId <= 0 ||
        courseIds.has(courseId) || !COURSE_STATUSES.has(course.status || 'planned')) return false
      courseIds.add(courseId)
      return typeof (course.note || '') === 'string'
    })
  })
}

export function readRoadmapStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const legacyMajorId = Number(window.localStorage.getItem('coursePlanner.selectedMajorId'))
      return {
        ...emptyStorage(),
        selectedMajorId: Number.isInteger(legacyMajorId) && legacyMajorId > 0 ? legacyMajorId : null,
      }
    }
    const parsed = JSON.parse(raw)
    if (parsed?.version !== STORAGE_VERSION || !parsed.byMajor || typeof parsed.byMajor !== 'object') {
      return emptyStorage()
    }
    const byMajor = {}
    for (const [majorId, draft] of Object.entries(parsed.byMajor)) {
      if (!Number.isInteger(Number(majorId)) || Number(majorId) <= 0 ||
        !validSemesters(draft?.semesters) || !Array.isArray(draft?.courses) ||
        !draft.courses.every(validCourse)) continue
      byMajor[majorId] = {
        majorId: Number(majorId),
        semesters: draft.semesters.map(semester => ({
          semesterId: Number(semester.semesterId),
          term: semester.term.trim(),
          courses: semester.courses.map(course => ({
            courseId: Number(course.courseId),
            status: course.status || 'planned',
            note: course.note || '',
          })),
        })),
        courses: draft.courses.map(course => ({
          courseId: Number(course.courseId),
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          units: Number.isFinite(Number(course.units)) ? Number(course.units) : 0,
          department: typeof course.department === 'string' ? course.department : '',
          description: typeof course.description === 'string' ? course.description : null,
          requirementIds: Array.isArray(course.requirementIds) ? course.requirementIds : [],
          requirementNames: Array.isArray(course.requirementNames) ? course.requirementNames : [],
        })),
        hasUnsavedChanges: draft.hasUnsavedChanges === true,
      }
    }
    const selectedMajorId = Number(parsed.selectedMajorId)
    return {
      version: STORAGE_VERSION,
      selectedMajorId: Number.isInteger(selectedMajorId) && selectedMajorId > 0 ? selectedMajorId : null,
      byMajor,
    }
  } catch {
    return emptyStorage()
  }
}

export function getSavedSelectedMajorId() {
  return readRoadmapStorage().selectedMajorId
}

export function getRoadmapDraft(majorId) {
  if (!Number.isInteger(Number(majorId)) || Number(majorId) <= 0) return null
  return readRoadmapStorage().byMajor[String(majorId)] || null
}

export function persistRoadmapState(state) {
  if (!state || state.isLoadingRoadmap || !state.majorInfo || !state.majorId ||
    !Array.isArray(state.semesters) || !Array.isArray(state.courses)) return false
  try {
    const storage = readRoadmapStorage()
    const majorId = Number(state.majorId)
    storage.selectedMajorId = majorId
    storage.byMajor[String(majorId)] = {
      majorId,
      semesters: state.semesters,
      courses: state.courses,
      hasUnsavedChanges: state.hasUnsavedChanges === true,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    return true
  } catch {
    return false
  }
}
