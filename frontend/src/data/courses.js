const courses = [
  // Lower Division CMPE
  { courseId: 1, courseCode: "CMPE 30", courseTitle: "Programming Concepts and Methodology", description: "Problem solving, algorithm development, and object-oriented programming using Java.", units: 3, department: "CMPE" },
  { courseId: 2, courseCode: "CMPE 50", courseTitle: "Object-Oriented Concepts and Methodology", description: "Advanced object-oriented programming concepts including inheritance, polymorphism, and design patterns.", units: 3, department: "CMPE" },
  { courseId: 3, courseCode: "CMPE 102", courseTitle: "Assembly Language Programming", description: "Machine and assembly language programming for microprocessors.", units: 3, department: "CMPE" },
  { courseId: 4, courseCode: "CMPE 120", courseTitle: "Computer Organization and Architecture", description: "Introduction to computer organization, digital logic, and processor design.", units: 3, department: "CMPE" },
  { courseId: 5, courseCode: "CMPE 124", courseTitle: "Digital Design I", description: "Combinational and sequential logic design using HDL.", units: 3, department: "CMPE" },
  { courseId: 6, courseCode: "CMPE 131", courseTitle: "Software Engineering I", description: "Introduction to software engineering processes, requirements, and design.", units: 3, department: "CMPE" },

  // Upper Division CMPE
  { courseId: 7, courseCode: "CMPE 110", courseTitle: "Electronic Circuit Design I", description: "Analysis and design of electronic circuits including amplifiers and filters.", units: 3, department: "CMPE" },
  { courseId: 8, courseCode: "CMPE 126", courseTitle: "Algorithms and Data Structure Design", description: "Design and analysis of algorithms, data structures including trees, graphs, and hash tables.", units: 3, department: "CMPE" },
  { courseId: 9, courseCode: "CMPE 127", courseTitle: "Microprocessor Design I", description: "Design and interfacing of microprocessor-based systems.", units: 3, department: "CMPE" },
  { courseId: 10, courseCode: "CMPE 130", courseTitle: "Advanced Algorithm Design", description: "Advanced topics in algorithm design including dynamic programming and graph algorithms.", units: 3, department: "CMPE" },
  { courseId: 11, courseCode: "CMPE 132", courseTitle: "Information Security", description: "Fundamentals of computer and information security, cryptography, and network security.", units: 3, department: "CMPE" },
  { courseId: 12, courseCode: "CMPE 133", courseTitle: "Software Engineering II", description: "Advanced software engineering: testing, maintenance, and project management.", units: 3, department: "CMPE" },
  { courseId: 13, courseCode: "CMPE 146", courseTitle: "Real-Time Embedded Systems", description: "Design and programming of real-time embedded systems using RTOS.", units: 3, department: "CMPE" },
  { courseId: 14, courseCode: "CMPE 148", courseTitle: "Computer Networking", description: "Network architectures, protocols, and applications including TCP/IP.", units: 3, department: "CMPE" },
  { courseId: 15, courseCode: "CMPE 152", courseTitle: "Compiler Design", description: "Principles and techniques of compiler construction including lexing, parsing, and code generation.", units: 3, department: "CMPE" },
  { courseId: 16, courseCode: "CMPE 172", courseTitle: "Enterprise Software Platforms", description: "Design and development of enterprise-level software applications.", units: 3, department: "CMPE" },
  { courseId: 17, courseCode: "CMPE 187", courseTitle: "Software Quality Engineering", description: "Software quality assurance, testing strategies, and quality metrics.", units: 3, department: "CMPE" },
  { courseId: 18, courseCode: "CMPE 195A", courseTitle: "Senior Design Project I", description: "First semester of the capstone senior design project.", units: 3, department: "CMPE" },
  { courseId: 19, courseCode: "CMPE 195B", courseTitle: "Senior Design Project II", description: "Second semester of the capstone senior design project.", units: 3, department: "CMPE" },

  // CS
  { courseId: 20, courseCode: "CS 46B", courseTitle: "Introduction to Data Structures", description: "Fundamental data structures including lists, stacks, queues, and trees in Java.", units: 4, department: "CS" },

  // Math
  { courseId: 21, courseCode: "MATH 30", courseTitle: "Calculus I", description: "Limits, derivatives, and integrals of single-variable functions.", units: 3, department: "MATH" },
  { courseId: 22, courseCode: "MATH 31", courseTitle: "Calculus II", description: "Techniques of integration, sequences, series, and parametric equations.", units: 3, department: "MATH" },
  { courseId: 23, courseCode: "MATH 32", courseTitle: "Calculus III", description: "Multivariable calculus including partial derivatives and multiple integrals.", units: 3, department: "MATH" },
  { courseId: 24, courseCode: "MATH 42", courseTitle: "Discrete Mathematics", description: "Logic, sets, relations, functions, combinatorics, and graph theory.", units: 3, department: "MATH" },
  { courseId: 25, courseCode: "MATH 123", courseTitle: "Differential Equations", description: "Ordinary differential equations and their applications.", units: 3, department: "MATH" },

  // Physics
  { courseId: 26, courseCode: "PHYS 50", courseTitle: "Mechanics", description: "Classical mechanics including kinematics, dynamics, energy, and momentum.", units: 4, department: "PHYS" },
  { courseId: 27, courseCode: "PHYS 51", courseTitle: "Electricity and Magnetism", description: "Electric fields, magnetic fields, circuits, and electromagnetic waves.", units: 4, department: "PHYS" },

  // Engineering
  { courseId: 28, courseCode: "ENGR 10", courseTitle: "Introduction to Engineering", description: "Overview of engineering disciplines and the engineering design process.", units: 3, department: "ENGR" },

  // English / GE
  { courseId: 29, courseCode: "ENGL 1A", courseTitle: "First-Year Writing", description: "Academic writing, critical reading, and research-based argumentation.", units: 3, department: "ENGL" },
  { courseId: 30, courseCode: "ENGL 1B", courseTitle: "Argument and Analysis", description: "Advanced academic writing with emphasis on argument, analysis, and research.", units: 3, department: "ENGL" },
]

export const courseMap = new Map(courses.map(c => [c.courseId, c]))

export default courses
