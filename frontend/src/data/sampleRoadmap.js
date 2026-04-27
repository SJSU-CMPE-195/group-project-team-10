const sampleRoadmap = {
  majorId: 1,
  semesters: [
    {
      semesterId: 1,
      term: "Fall 2022",
      courses: [
        { courseId: 1, status: "completed" },   // CMPE 30
        { courseId: 21, status: "completed" },   // MATH 30
        { courseId: 29, status: "completed" },   // ENGL 1A
        { courseId: 28, status: "completed" },   // ENGR 10
      ],
    },
    {
      semesterId: 2,
      term: "Spring 2023",
      courses: [
        { courseId: 2, status: "completed" },    // CMPE 50
        { courseId: 20, status: "completed" },   // CS 46B
        { courseId: 22, status: "completed" },   // MATH 31
        { courseId: 24, status: "completed" },   // MATH 42
        { courseId: 30, status: "completed" },   // ENGL 1B
      ],
    },
    {
      semesterId: 3,
      term: "Fall 2023",
      courses: [
        { courseId: 4, status: "completed" },    // CMPE 120
        { courseId: 3, status: "completed" },    // CMPE 102
        { courseId: 26, status: "completed" },   // PHYS 50
        { courseId: 23, status: "completed" },   // MATH 32
      ],
    },
    {
      semesterId: 4,
      term: "Spring 2024",
      courses: [
        { courseId: 8, status: "completed" },    // CMPE 126
        { courseId: 5, status: "completed" },    // CMPE 124
        { courseId: 6, status: "completed" },    // CMPE 131
        { courseId: 27, status: "completed" },   // PHYS 51
        { courseId: 25, status: "completed" },   // MATH 123
      ],
    },
    {
      semesterId: 5,
      term: "Fall 2024",
      courses: [
        { courseId: 9, status: "in_progress" },  // CMPE 127
        { courseId: 10, status: "in_progress" }, // CMPE 130
        { courseId: 7, status: "in_progress" },  // CMPE 110
        { courseId: 12, status: "in_progress" }, // CMPE 133
      ],
    },
    {
      semesterId: 6,
      term: "Spring 2025",
      courses: [
        { courseId: 13, status: "planned" },     // CMPE 146
        { courseId: 14, status: "planned" },     // CMPE 148
        { courseId: 11, status: "planned" },     // CMPE 132
        { courseId: 16, status: "planned" },     // CMPE 172
      ],
    },
    {
      semesterId: 7,
      term: "Fall 2025",
      courses: [
        { courseId: 15, status: "planned" },     // CMPE 152
        { courseId: 17, status: "planned" },     // CMPE 187
        { courseId: 18, status: "planned" },     // CMPE 195A
        { courseId: 31, status: "planned" },     // ENGR 195A
      ],
    },
    {
      semesterId: 8,
      term: "Spring 2026",
      courses: [
        { courseId: 19, status: "planned" },     // CMPE 195B
        { courseId: 32, status: "planned" },     // ENGR 195B
      ],
    },
  ],
}

export default sampleRoadmap
