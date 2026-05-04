package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.CatalogProgramImportResultDto
import edu.sjsu.courseplanner.backend.service.ParsedCatalogCourse
import edu.sjsu.courseplanner.backend.service.ParsedCatalogProgram
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

@Repository
class CatalogProgramImportRepository(
    private val database: Database
) {
    fun importProgram(program: ParsedCatalogProgram): CatalogProgramImportResultDto = transaction(database) {
        val majorId = upsertMajor(program)
        val allCourses = program.requirements.flatMap { it.courses }.distinctBy { it.courseCode }
        val courseIdsByCode = upsertCourses(allCourses).toMutableMap()

        val importedCourseIds = allCourses.mapNotNull { courseIdsByCode[it.courseCode] }
        if (importedCourseIds.isNotEmpty()) {
            PrerequisitesTable.deleteWhere { PrerequisitesTable.courseId inList importedCourseIds }
        }

        program.prerequisites.forEach { prerequisite ->
            val courseId = courseIdsByCode[prerequisite.courseCode] ?: return@forEach
            val prereqCourseId = courseIdsByCode[prerequisite.prereqCourseCode]
                ?: upsertStubCourse(prerequisite.prereqCourseCode).also {
                    courseIdsByCode[prerequisite.prereqCourseCode] = it
                }

            PrerequisitesTable.insert { statement ->
                statement[PrerequisitesTable.courseId] = courseId
                statement[PrerequisitesTable.prereqCourseId] = prereqCourseId
                statement[PrerequisitesTable.prereqType] = prerequisite.prereqType
            }
        }

        val oldRequirementIds = DegreeRequirementsTable
            .selectAll()
            .where { DegreeRequirementsTable.majorId eq majorId }
            .map { it[DegreeRequirementsTable.id] }

        if (oldRequirementIds.isNotEmpty()) {
            RequirementCoursesTable.deleteWhere { RequirementCoursesTable.requirementId inList oldRequirementIds }
            DegreeRequirementsTable.deleteWhere { DegreeRequirementsTable.id inList oldRequirementIds }
        }

        var requirementCoursesCreated = 0
        program.requirements.forEach { requirement ->
            val requirementId = DegreeRequirementsTable.insert { statement ->
                statement[DegreeRequirementsTable.majorId] = majorId
                statement[DegreeRequirementsTable.categoryName] = requirement.categoryName
                statement[DegreeRequirementsTable.requiredUnits] = requirement.requiredUnits
            } get DegreeRequirementsTable.id

            requirement.courses.forEach { course ->
                val courseId = requireNotNull(courseIdsByCode[course.courseCode]) { "Missing course ID for ${course.courseCode}" }
                RequirementCoursesTable.insert { statement ->
                    statement[RequirementCoursesTable.requirementId] = requirementId
                    statement[RequirementCoursesTable.courseId] = courseId
                }
                requirementCoursesCreated++
            }
        }

        CatalogProgramImportResultDto(
            programKey = program.programKey,
            sourceUrl = program.sourceUrl,
            majorId = majorId,
            majorName = program.majorName,
            totalUnits = program.totalUnits,
            coursesUpserted = allCourses.size,
            requirementsCreated = program.requirements.size,
            requirementCoursesCreated = requirementCoursesCreated,
            prerequisitesCreated = program.prerequisites.size
        )
    }

    private fun upsertMajor(program: ParsedCatalogProgram): Int {
        val existingId = MajorsTable
            .selectAll()
            .where { MajorsTable.majorName eq program.majorName }
            .singleOrNull()
            ?.get(MajorsTable.id)

        if (existingId != null) {
            MajorsTable.update({ MajorsTable.id eq existingId }) { statement ->
                statement[department] = program.department
                statement[totalUnits] = program.totalUnits
            }
            return existingId
        }

        return MajorsTable.insert { statement ->
            statement[majorName] = program.majorName
            statement[department] = program.department
            statement[totalUnits] = program.totalUnits
        } get MajorsTable.id
    }

    private fun upsertCourses(courses: List<ParsedCatalogCourse>): Map<String, Int> {
        return courses.associate { course ->
            course.courseCode to upsertCourse(course)
        }
    }

    private fun upsertCourse(course: ParsedCatalogCourse): Int {
        val existingId = CoursesTable
            .selectAll()
            .where { CoursesTable.courseCode eq course.courseCode }
            .singleOrNull()
            ?.get(CoursesTable.id)

        if (existingId != null) {
            CoursesTable.update({ CoursesTable.id eq existingId }) { statement ->
                statement[courseTitle] = course.courseTitle
                statement[description] = null
                statement[units] = course.units
                statement[department] = course.department
                statement[difficultyScore] = null
                statement[avgWorkload] = null
                statement[syllabusUrl] = null
            }
            return existingId
        }

        return CoursesTable.insert { statement ->
            statement[courseCode] = course.courseCode
            statement[courseTitle] = course.courseTitle
            statement[description] = null
            statement[units] = course.units
            statement[department] = course.department
            statement[difficultyScore] = null
            statement[avgWorkload] = null
            statement[syllabusUrl] = null
        } get CoursesTable.id
    }

    private fun upsertStubCourse(courseCode: String): Int {
        val existingId = CoursesTable
            .selectAll()
            .where { CoursesTable.courseCode eq courseCode }
            .singleOrNull()
            ?.get(CoursesTable.id)

        if (existingId != null) return existingId

        return CoursesTable.insert { statement ->
            statement[CoursesTable.courseCode] = courseCode
            statement[CoursesTable.courseTitle] = courseCode
            statement[CoursesTable.description] = null
            statement[CoursesTable.units] = 0
            statement[CoursesTable.department] = courseCode.substringBefore(' ')
            statement[CoursesTable.difficultyScore] = null
            statement[CoursesTable.avgWorkload] = null
            statement[CoursesTable.syllabusUrl] = null
        } get CoursesTable.id
    }
}
