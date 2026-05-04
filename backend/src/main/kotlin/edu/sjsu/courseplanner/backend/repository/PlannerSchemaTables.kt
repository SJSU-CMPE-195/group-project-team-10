package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.CurrentTimestamp
import org.jetbrains.exposed.v1.javatime.timestamp

object MajorsTable : Table("majors") {
    val id = integer("major_id").autoIncrement()
    val majorName = varchar("major_name", 100)
    val department = varchar("department", 100)
    val totalUnits = integer("total_units")

    override val primaryKey = PrimaryKey(id)
}

object StudentsTable : Table("students") {
    val id = integer("student_id").autoIncrement()
    val sjsuId = varchar("sjsu_id", 9).uniqueIndex()
    val firstName = varchar("first_name", 50).nullable()
    val lastName = varchar("last_name", 50).nullable()
    val email = varchar("email", 100).uniqueIndex().nullable()
    val majorId = reference("major_id", MajorsTable.id).nullable()
    val startTerm = varchar("start_term", 20).nullable()
    val expectedGrad = varchar("expected_grad", 20).nullable()
    val createdAt = timestamp("created_at").defaultExpression(CurrentTimestamp).nullable()

    override val primaryKey = PrimaryKey(id)
}

object DegreeRequirementsTable : Table("degree_requirements") {
    val id = integer("requirement_id").autoIncrement()
    val majorId = reference("major_id", MajorsTable.id)
    val categoryName = varchar("category_name", 100)
    val requiredUnits = integer("required_units")

    override val primaryKey = PrimaryKey(id)
}

object CoursesTable : Table("courses") {
    val id = integer("course_id").autoIncrement()
    val courseCode = varchar("course_code", 20).uniqueIndex()
    val courseTitle = varchar("course_title", 200)
    val description = text("description").nullable()
    val units = integer("units")
    val department = varchar("department", 50)
    val difficultyScore = double("difficulty_score").nullable()
    val avgWorkload = double("avg_workload").nullable()
    val syllabusUrl = text("syllabus_url").nullable()

    override val primaryKey = PrimaryKey(id)
}

object InstructorsTable : Table("instructors") {
    val id = integer("instructor_id").autoIncrement()
    val name = varchar("name", 100)
    val department = varchar("department", 100).nullable()
    val rateMyProfUrl = text("rate_my_prof_url").nullable()
    val rating = double("rating").nullable()

    override val primaryKey = PrimaryKey(id)
}

object CourseOfferingsTable : Table("course_offerings") {
    val id = integer("offering_id").autoIncrement()
    val courseId = reference("course_id", CoursesTable.id)
    val term = varchar("term", 20)
    val sectionNumber = varchar("section_number", 10)
    val instructorId = reference("instructor_id", InstructorsTable.id).nullable()
    val mode = varchar("mode", 20).nullable()
    val seatsAvailable = integer("seats_available").default(0)
    val scheduleInfo = text("schedule_info").nullable()

    override val primaryKey = PrimaryKey(id)
}

object PrerequisitesTable : Table("prerequisites") {
    val courseId = reference("course_id", CoursesTable.id)
    val prereqCourseId = reference("prereq_course_id", CoursesTable.id)
    val prereqType = varchar("prereq_type", 20)

    override val primaryKey = PrimaryKey(courseId, prereqCourseId)
}

object RequirementCoursesTable : Table("requirement_courses") {
    val requirementId = reference("requirement_id", DegreeRequirementsTable.id)
    val courseId = reference("course_id", CoursesTable.id)

    override val primaryKey = PrimaryKey(requirementId, courseId)
}

object StudentHistoryTable : Table("student_history") {
    val id = integer("history_id").autoIncrement()
    val studentId = reference("student_id", StudentsTable.id)
    val courseId = reference("course_id", CoursesTable.id)
    val termTaken = varchar("term_taken", 20).nullable()
    val grade = varchar("grade", 2).nullable()
    val status = varchar("status", 20).nullable()

    override val primaryKey = PrimaryKey(id)
}

object StudentRoadmapsTable : Table("student_roadmaps") {
    val id = integer("roadmap_id").autoIncrement()
    val studentId = reference("student_id", StudentsTable.id)
    val courseId = reference("course_id", CoursesTable.id)
    val plannedTerm = varchar("planned_term", 20).nullable()
    val status = varchar("status", 20).nullable()

    override val primaryKey = PrimaryKey(id)
}

object SemestersTable : Table("semesters") {
    val id = integer("semester_id").autoIncrement()
    val studentId = reference("student_id", StudentsTable.id)
    val term = varchar("term", 20)
    val totalUnits = integer("total_units").default(0)
    val status = varchar("status", 20).nullable()

    override val primaryKey = PrimaryKey(id)
}

object SemesterCoursesTable : Table("semester_courses") {
    val semesterId = reference("semester_id", SemestersTable.id)
    val courseId = reference("course_id", CoursesTable.id)

    override val primaryKey = PrimaryKey(semesterId, courseId)
}

object SectionsTable : Table("sections") {
    val id = long("id").autoIncrement()
    val term = varchar("term", 255)
    val courseCode = varchar("course_code", 255)
    val sectionCode = varchar("section_code", 255)
    val classNumber = varchar("class_number", 255)
    val modeOfInstruction = varchar("mode_of_instruction", 255)
    val title = varchar("title", 500)
    val satisfies = varchar("satisfies", 255).nullable()
    val units = double("units")
    val type = varchar("TYPE", 255)
    val days = varchar("days", 255)
    val times = varchar("times", 255)
    val instructor = varchar("instructor", 255)
    val location = varchar("location", 255)
    val dates = varchar("dates", 255)
    val openSeats = integer("open_seats")
    val notes = text("notes").nullable()

    override val primaryKey = PrimaryKey(id)
}

object UsersTable : Table("users") {
    val id = long("id").autoIncrement()
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = varchar("password_hash", 255).nullable()
    val fullName = varchar("full_name", 255)
    val provider = varchar("provider", 50)
    val googleSub = varchar("google_sub", 255).uniqueIndex().nullable()
    val ssoSubject = varchar("sso_subject", 255).uniqueIndex().nullable()

    override val primaryKey = PrimaryKey(id)
}

val plannerSchemaTables = arrayOf(
    MajorsTable,
    StudentsTable,
    DegreeRequirementsTable,
    CoursesTable,
    InstructorsTable,
    CourseOfferingsTable,
    PrerequisitesTable,
    RequirementCoursesTable,
    StudentHistoryTable,
    StudentRoadmapsTable,
    SemestersTable,
    SemesterCoursesTable,
    SectionsTable,
    UsersTable
)
