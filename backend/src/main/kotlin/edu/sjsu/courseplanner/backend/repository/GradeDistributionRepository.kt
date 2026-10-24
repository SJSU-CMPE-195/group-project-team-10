package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.GradeDistributionDto
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteAll
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository

@Repository
class GradeDistributionRepository(
    private val database: Database
) {

    fun findAll(): List<GradeDistributionDto> = transaction(database) {
        GradeDistributionsTable
            .selectAll()
            .map { row ->
                GradeDistributionDto(
                    academicYear = row[GradeDistributionsTable.academicYear],
                    semester = row[GradeDistributionsTable.semester],
                    courseNumber = row[GradeDistributionsTable.courseNumber],
                    instructor = row[GradeDistributionsTable.instructor],
                    aCount = row[GradeDistributionsTable.aCount],
                    bCount = row[GradeDistributionsTable.bCount],
                    cCount = row[GradeDistributionsTable.cCount],
                    dCount = row[GradeDistributionsTable.dCount],
                    fCount = row[GradeDistributionsTable.fCount]
                )
            }
    }

    fun replaceAll(distributions: List<GradeDistributionImportRecord>): Int =
        transaction(database) {

            GradeDistributionsTable.deleteAll()

            distributions.forEach { distribution ->
                GradeDistributionsTable.insert { statement ->
                    statement[academicYear] = distribution.academicYear
                    statement[semester] = distribution.semester
                    statement[department] = distribution.department
                    statement[courseNumber] = distribution.courseNumber
                    statement[instructor] = distribution.instructor

                    statement[aCount] = distribution.aCount
                    statement[bCount] = distribution.bCount
                    statement[cCount] = distribution.cCount
                    statement[dCount] = distribution.dCount
                    statement[fCount] = distribution.fCount
                }
            }

            distributions.size
        }

    fun findByCourse(courseNumber: String): List<GradeDistributionDto> =
        findAll().filter { distribution ->
            normalizeCourseCode(distribution.courseNumber) ==
                    normalizeCourseCode(courseNumber)
        }

    private fun normalizeCourseCode(value: String): String {
        val cleaned = value
            .uppercase()
            .trim()
            .replace(Regex("\\s+"), " ")

        val match = Regex("^([A-Z0-9]+)\\s+0*([0-9]+)([A-Z]*)$")
            .matchEntire(cleaned)

        if (match != null) {
            val department = match.groupValues[1]
            val number = match.groupValues[2]
            val suffix = match.groupValues[3]

            return "$department $number$suffix"
        }

        return cleaned
    }
}

data class GradeDistributionImportRecord(
    val academicYear: String,
    val semester: String,
    val department: String,
    val courseNumber: String,
    val instructor: String,
    val aCount: Int,
    val bCount: Int,
    val cCount: Int,
    val dCount: Int,
    val fCount: Int
)