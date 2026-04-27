// prereqType: "prereq" = must complete before, "coreq" = must take same semester or before
const prerequisites = [
  { courseId: 2, prereqCourseId: 1, prereqType: "prereq" },
  { courseId: 3, prereqCourseId: 2, prereqType: "prereq" },
  { courseId: 4, prereqCourseId: 2, prereqType: "prereq" },
  { courseId: 5, prereqCourseId: 4, prereqType: "prereq" },
  { courseId: 6, prereqCourseId: 2, prereqType: "prereq" },
  { courseId: 7, prereqCourseId: 27, prereqType: "prereq" },
  { courseId: 8, prereqCourseId: 4, prereqType: "prereq" },
  { courseId: 8, prereqCourseId: 20, prereqType: "prereq" },
  { courseId: 9, prereqCourseId: 4, prereqType: "prereq" },
  { courseId: 9, prereqCourseId: 5, prereqType: "prereq" },
  { courseId: 10, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 11, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 12, prereqCourseId: 6, prereqType: "prereq" },
  { courseId: 13, prereqCourseId: 9, prereqType: "prereq" },
  { courseId: 13, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 14, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 15, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 16, prereqCourseId: 6, prereqType: "prereq" },
  { courseId: 16, prereqCourseId: 8, prereqType: "prereq" },
  { courseId: 17, prereqCourseId: 6, prereqType: "prereq" },
  { courseId: 18, prereqCourseId: 12, prereqType: "prereq" },
  { courseId: 19, prereqCourseId: 18, prereqType: "prereq" },
  { courseId: 20, prereqCourseId: 1, prereqType: "prereq" },
  { courseId: 22, prereqCourseId: 21, prereqType: "prereq" },
  { courseId: 23, prereqCourseId: 22, prereqType: "prereq" },
  { courseId: 24, prereqCourseId: 21, prereqType: "prereq" },
  { courseId: 25, prereqCourseId: 23, prereqType: "prereq" },
  { courseId: 27, prereqCourseId: 26, prereqType: "prereq" },
  { courseId: 30, prereqCourseId: 29, prereqType: "prereq" },
  { courseId: 18, prereqCourseId: 31, prereqType: "coreq" },  // CMPE 195A coreq ENGR 195A
  { courseId: 31, prereqCourseId: 18, prereqType: "coreq" },  // ENGR 195A coreq CMPE 195A
  { courseId: 19, prereqCourseId: 32, prereqType: "coreq" },  // CMPE 195B coreq ENGR 195B
  { courseId: 32, prereqCourseId: 19, prereqType: "coreq" },  // ENGR 195B coreq CMPE 195B
]

// Map from courseId -> array of its prerequisite edges
export const prereqMap = new Map()
for (const p of prerequisites) {
  if (!prereqMap.has(p.courseId)) prereqMap.set(p.courseId, [])
  prereqMap.get(p.courseId).push(p)
}

export default prerequisites
