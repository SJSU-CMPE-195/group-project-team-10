package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.TechnicalElectiveImportDto
import edu.sjsu.courseplanner.backend.service.ParsedCatalogCourse
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Repository
import org.springframework.web.server.ResponseStatusException

@Repository
class TechnicalElectiveImportRepository(
    private val database: Database
) {
    fun import(programKey: String, courses: List<ParsedCatalogCourse>): TechnicalElectiveImportDto =
        transaction(database) {
            val majorRow = MajorsTable.selectAll()
                .firstOrNull { row ->
                    row[MajorsTable.catalogProgramKey]?.equals(programKey, ignoreCase = true) == true
                }
                ?: MajorsTable.selectAll().firstOrNull { row ->
                    when (programKey) {
                        "swe" -> row[MajorsTable.majorName].contains("software engineering", ignoreCase = true)
                        "cmpe" -> row[MajorsTable.majorName].contains("computer engineering", ignoreCase = true)
                        else -> false
                    }
                }
                ?: throw ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Import the $programKey major requirements before importing its technical electives"
                )

            val majorId = majorRow[MajorsTable.id]
            val majorName = majorRow[MajorsTable.majorName]
            val existingRequirements = DegreeRequirementsTable.selectAll()
                .where { DegreeRequirementsTable.majorId eq majorId }
                .toList()
            val approvedRequirement = existingRequirements.firstOrNull {
                it[DegreeRequirementsTable.categoryName]
                    .contains(APPROVED_UPPER_DIVISION_CATEGORY, ignoreCase = true)
            }
            val requirementId = approvedRequirement?.get(DegreeRequirementsTable.id)
                ?: DegreeRequirementsTable.insert { row ->
                    row[DegreeRequirementsTable.majorId] = majorId
                    row[DegreeRequirementsTable.categoryName] = APPROVED_UPPER_DIVISION_CATEGORY
                    row[DegreeRequirementsTable.requiredUnits] = REQUIRED_UNITS
                } get DegreeRequirementsTable.id

            val legacyTechnicalRequirements = existingRequirements.filter {
                it[DegreeRequirementsTable.categoryName].equals(LEGACY_TECHNICAL_ELECTIVES_CATEGORY, ignoreCase = true)
            }
            legacyTechnicalRequirements.forEach { requirement ->
                RequirementCoursesTable.deleteWhere {
                    RequirementCoursesTable.requirementId eq requirement[DegreeRequirementsTable.id]
                }
                DegreeRequirementsTable.deleteWhere {
                    DegreeRequirementsTable.id eq requirement[DegreeRequirementsTable.id]
                }
            }

            RequirementCoursesTable.deleteWhere { RequirementCoursesTable.requirementId eq requirementId }
            val existingCourseIds = CoursesTable.selectAll()
                .associate { it[CoursesTable.courseCode] to it[CoursesTable.id] }
            var coursesCreated = 0
            var linksCreated = 0

            courses.distinctBy { it.courseCode }.forEach { course ->
                val courseId = existingCourseIds[course.courseCode] ?: run {
                    val id = CoursesTable.insert { row ->
                        row[CoursesTable.courseCode] = course.courseCode
                        row[CoursesTable.courseTitle] = course.courseTitle
                        row[CoursesTable.description] = null
                        row[CoursesTable.units] = course.units
                        row[CoursesTable.department] = course.department
                        row[CoursesTable.difficultyScore] = null
                        row[CoursesTable.avgWorkload] = null
                        row[CoursesTable.syllabusUrl] = null
                    } get CoursesTable.id
                    coursesCreated++
                    id
                }

                RequirementCoursesTable.insert { row ->
                    row[RequirementCoursesTable.requirementId] = requirementId
                    row[RequirementCoursesTable.courseId] = courseId
                }
                linksCreated++
            }

            DegreeRequirementsTable.update({ DegreeRequirementsTable.id eq requirementId }) { row ->
                row[requiredUnits] = REQUIRED_UNITS
                row[categoryName] = APPROVED_UPPER_DIVISION_CATEGORY
            }

            TechnicalElectiveImportDto(
                programKey = programKey,
                majorId = majorId,
                majorName = majorName,
                requirementId = requirementId,
                coursesImported = courses.distinctBy { it.courseCode }.size,
                coursesCreated = coursesCreated,
                requirementCoursesCreated = linksCreated
            )
        }

    private companion object {
        const val APPROVED_UPPER_DIVISION_CATEGORY = "Approved Upper Division Electives"
        const val LEGACY_TECHNICAL_ELECTIVES_CATEGORY = "Technical Electives"
        const val REQUIRED_UNITS = 6
    }
}
