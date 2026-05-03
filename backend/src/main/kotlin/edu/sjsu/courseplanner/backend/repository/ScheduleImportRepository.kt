package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository

data class ScheduleImportResult(
    val term: String,
    val coursesCreated: Int,
    val instructorsCreated: Int,
    val offeringsSaved: Int,
    val sectionsSaved: Int
)

@Repository
class ScheduleImportRepository(
    private val database: Database
) {

    fun importScrapedTerm(term: String, scrapedRows: List<ScrapedSectionDto>): ScheduleImportResult = transaction(database) {
        val normalizedRows = scrapedRows
            .map(::normalizeScrapedRow)
            .distinctBy { it.classNumber }

        val courseIdsByCode = loadCourseIdsByCode().toMutableMap()
        val instructorIdsByName = loadInstructorIdsByName().toMutableMap()

        var coursesCreated = 0
        var instructorsCreated = 0

        normalizedRows.forEach { row ->
            if (!courseIdsByCode.containsKey(row.courseCode)) {
                val courseId = insertCourse(row)
                courseIdsByCode[row.courseCode] = courseId
                coursesCreated++
            }

            if (row.instructor.isNotBlank() && row.instructor.uppercase() != "STAFF" && !instructorIdsByName.containsKey(row.instructor)) {
                val instructorId = insertInstructor(row.instructor, row.courseCode)
                instructorIdsByName[row.instructor] = instructorId
                instructorsCreated++
            }
        }

        CourseOfferingsTable.deleteWhere { CourseOfferingsTable.term eq term }
        SectionsTable.deleteWhere { SectionsTable.term eq term }

        normalizedRows.forEach { row ->
            val courseId = requireNotNull(courseIdsByCode[row.courseCode]) { "Missing course ID for ${row.courseCode}" }
            val instructorId = instructorIdsByName[row.instructor]

            CourseOfferingsTable.insert { statement ->
                statement[CourseOfferingsTable.courseId] = courseId
                statement[CourseOfferingsTable.term] = term
                statement[CourseOfferingsTable.sectionNumber] = row.sectionCode
                statement[CourseOfferingsTable.instructorId] = instructorId
                statement[CourseOfferingsTable.mode] = row.modeOfInstruction
                statement[CourseOfferingsTable.seatsAvailable] = row.openSeats
                statement[CourseOfferingsTable.scheduleInfo] = buildScheduleInfo(row).take(100)
            }

            SectionsTable.insert { statement ->
                statement[SectionsTable.term] = term
                statement[SectionsTable.courseCode] = row.courseCode
                statement[SectionsTable.sectionCode] = row.sectionCode
                statement[SectionsTable.classNumber] = row.classNumber
                statement[SectionsTable.modeOfInstruction] = row.modeOfInstruction
                statement[SectionsTable.title] = row.title
                statement[SectionsTable.satisfies] = row.satisfies
                statement[SectionsTable.units] = row.units
                statement[SectionsTable.type] = row.type
                statement[SectionsTable.days] = row.days
                statement[SectionsTable.times] = row.times
                statement[SectionsTable.instructor] = row.instructor
                statement[SectionsTable.location] = row.location
                statement[SectionsTable.dates] = row.dates
                statement[SectionsTable.openSeats] = row.openSeats
                statement[SectionsTable.notes] = row.notes.joinToString(" | ").ifBlank { null }
            }
        }

        ScheduleImportResult(
            term = term,
            coursesCreated = coursesCreated,
            instructorsCreated = instructorsCreated,
            offeringsSaved = normalizedRows.size,
            sectionsSaved = normalizedRows.size
        )
    }

    fun findOfferingsByTerm(term: String): List<ResultRow> = transaction(database) {
        CourseOfferingsTable
            .selectAll()
            .andWhere { CourseOfferingsTable.term eq term }
            .orderBy(CourseOfferingsTable.sectionNumber to SortOrder.ASC)
            .toList()
    }

    private fun loadCourseIdsByCode(): Map<String, Int> {
        return CoursesTable
            .selectAll()
            .associate { row -> row[CoursesTable.courseCode] to row[CoursesTable.id] }
    }

    private fun loadInstructorIdsByName(): Map<String, Int> {
        return InstructorsTable
            .selectAll()
            .associate { row -> row[InstructorsTable.name] to row[InstructorsTable.id] }
    }

    private fun insertCourse(row: ScrapedSectionDto): Int {
        val department = row.courseCode.substringBefore(' ').ifBlank { "UNKNOWN" }
        return CoursesTable.insert { statement ->
            statement[CoursesTable.courseCode] = row.courseCode
            statement[CoursesTable.courseTitle] = row.title
            statement[CoursesTable.description] = null
            statement[CoursesTable.units] = row.units.toInt()
            statement[CoursesTable.department] = department
            statement[CoursesTable.difficultyScore] = null
            statement[CoursesTable.avgWorkload] = null
            statement[CoursesTable.syllabusUrl] = null
        } get CoursesTable.id
    }

    private fun insertInstructor(name: String, courseCode: String): Int {
        val department = courseCode.substringBefore(' ').ifBlank { "UNKNOWN" }

        return InstructorsTable.insert { statement ->
            statement[InstructorsTable.name] = name
            statement[InstructorsTable.department] = department
            statement[InstructorsTable.rateMyProfUrl] = null
            statement[InstructorsTable.rating] = null
        } get InstructorsTable.id
    }

    private fun normalizeScrapedRow(row: ScrapedSectionDto): ScrapedSectionDto {
        return row.copy(
            courseCode = row.courseCode.trim().replace(Regex("\\s+"), " "),
            sectionCode = row.sectionCode.trim(),
            classNumber = row.classNumber.trim(),
            modeOfInstruction = row.modeOfInstruction.trim(),
            title = row.title.trim(),
            satisfies = row.satisfies?.trim()?.ifBlank { null },
            type = row.type.trim(),
            days = row.days.trim(),
            times = row.times.trim(),
            instructor = row.instructor.trim(),
            location = row.location.trim(),
            dates = row.dates.trim(),
            notes = row.notes.map(String::trim).filter(String::isNotBlank)
        )
    }

    private fun buildScheduleInfo(row: ScrapedSectionDto): String {
        return listOf(row.days, row.times, row.location)
            .map(String::trim)
            .filter(String::isNotBlank)
            .joinToString(" | ")
            .ifBlank { "TBA" }
    }
}
