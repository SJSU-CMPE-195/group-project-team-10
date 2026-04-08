const degreeRequirements = [
  {
    requirementId: 1,
    majorId: 1,
    categoryName: "Lower Division Core",
    requiredUnits: 19,
    courseIds: [1, 2, 3, 4, 5, 20],
  },
  {
    requirementId: 2,
    majorId: 1,
    categoryName: "Upper Division Core",
    requiredUnits: 36,
    courseIds: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  },
  {
    requirementId: 3,
    majorId: 1,
    categoryName: "Software Engineering",
    requiredUnits: 9,
    courseIds: [6, 12, 17],
  },
  {
    requirementId: 4,
    majorId: 1,
    categoryName: "Math & Science",
    requiredUnits: 20,
    courseIds: [21, 22, 23, 24, 25, 26, 27],
  },
  {
    requirementId: 5,
    majorId: 1,
    categoryName: "Senior Design",
    requiredUnits: 6,
    courseIds: [18, 19],
  },
  {
    requirementId: 6,
    majorId: 1,
    categoryName: "General Education",
    requiredUnits: 9,
    courseIds: [28, 29, 30],
  },
]

export const majorInfo = {
  majorId: 1,
  majorName: "Computer Engineering, BS",
  totalRequiredUnits: 120,
}

export default degreeRequirements
