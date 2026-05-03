package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository

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

    fun findAvailableTerms(): List<String> = transaction(database) {
        CourseOfferingsTable
            .selectAll()
            .map { it[CourseOfferingsTable.term] }
            .distinct()
            .sortedWith(compareBy<String> { extractYear(it) }.thenBy { seasonOrder(it) })
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
            "spring" -> 0
            "summer" -> 1
            "fall" -> 2
            "winter" -> 3
            else -> 4
        }
    }
}
