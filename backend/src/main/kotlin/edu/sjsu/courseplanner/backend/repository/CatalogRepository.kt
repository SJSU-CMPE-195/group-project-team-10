package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class CatalogCourseRecord(
    val courseId: Int,
    val courseCode: String,
    val courseTitle: String,
    val description: String?,
    val units: Int,
    val department: String
)

data class CourseOfferingRecord(
    val courseId: Int,
    val term: String
)

@Repository
class CatalogRepository(
    private val database: Database
) {

    fun findAllCourses(): List<CatalogCourseRecord> = transaction(database) {
        CoursesTable
            .selectAll()
            .orderBy(CoursesTable.department to SortOrder.ASC)
            .orderBy(CoursesTable.courseCode to SortOrder.ASC)
            .map(::toCatalogCourseRecord)
    }

    fun findOfferings(term: String? = null): List<CourseOfferingRecord> = transaction(database) {
        CourseOfferingsTable
            .selectAll()
            .apply {
                if (!term.isNullOrBlank()) {
                    andWhere { CourseOfferingsTable.term eq term.trim() }
                }
            }
            .map { row ->
                CourseOfferingRecord(
                    courseId = row[CourseOfferingsTable.courseId],
                    term = row[CourseOfferingsTable.term]
                )
            }
    }

    // get available terms that have not ended
    fun findAvailableTerms(): List<String> = transaction(database) {
        val endByTerm = latestEndDateByTerm()
        val today = LocalDate.now()

        CourseOfferingsTable
            .selectAll()
            .map { it[CourseOfferingsTable.term] }
            .distinct()
            .filter { term ->
                val end = endByTerm[term]
                end == null || !end.isBefore(today)
            }
            .sortedWith(compareBy<String> { extractYear(it) }.thenBy { seasonOrder(it) })
    }

    // latest section end date per term
    private fun latestEndDateByTerm(): Map<String, LocalDate> {
        return SectionsTable
            .selectAll()
            .mapNotNull { row ->
                val end = parseEndDate(row[SectionsTable.dates]) ?: return@mapNotNull null
                row[SectionsTable.term] to end
            }
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, ends) -> ends.max() }
    }

    // "08/19/26-12/07/26" -> 2026-12-07
    private fun parseEndDate(dates: String?): LocalDate? {
        val end = dates?.substringAfter('-', "")?.trim()
        if (end.isNullOrEmpty()) return null

        return try {
            LocalDate.parse(end, DATE_FORMAT)
        } catch (_: Exception) {
            null
        }
    }

    private fun toCatalogCourseRecord(row: ResultRow): CatalogCourseRecord {
        return CatalogCourseRecord(
            courseId = row[CoursesTable.id],
            courseCode = row[CoursesTable.courseCode],
            courseTitle = row[CoursesTable.courseTitle],
            description = row[CoursesTable.description],
            units = row[CoursesTable.units],
            department = row[CoursesTable.department]
        )
    }

    private fun extractYear(term: String): Int {
        return term.substringAfterLast(' ').toIntOrNull() ?: Int.MAX_VALUE
    }

    private fun seasonOrder(term: String): Int {
        return when (term.substringBefore(' ').lowercase()) {
            "winter" -> 0
            "spring" -> 1
            "summer" -> 2
            "fall" -> 3
            else -> 4
        }
    }

    private companion object {
        val DATE_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("MM/dd/yy")
    }
}
