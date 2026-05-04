package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository

data class MajorRecord(
    val majorId: Int,
    val majorName: String,
    val department: String,
    val totalUnits: Int
)

data class RequirementRecord(
    val requirementId: Int,
    val majorId: Int,
    val categoryName: String,
    val requiredUnits: Int
)

data class RequirementCourseRecord(
    val requirementId: Int,
    val courseId: Int
)

data class RoadmapPrerequisiteRecord(
    val courseId: Int,
    val prereqCourseId: Int,
    val prereqType: String
)

@Repository
class RoadmapRepository(
    private val database: Database
) {
    fun findMajors(): List<MajorRecord> = transaction(database) {
        MajorsTable
            .selectAll()
            .orderBy(MajorsTable.majorName to SortOrder.ASC)
            .map(::toMajorRecord)
    }

    fun findMajor(majorId: Int): MajorRecord? = transaction(database) {
        MajorsTable
            .selectAll()
            .where { MajorsTable.id eq majorId }
            .singleOrNull()
            ?.let(::toMajorRecord)
    }

    fun findRequirements(majorId: Int): List<RequirementRecord> = transaction(database) {
        DegreeRequirementsTable
            .selectAll()
            .where { DegreeRequirementsTable.majorId eq majorId }
            .orderBy(DegreeRequirementsTable.id to SortOrder.ASC)
            .map { row ->
                RequirementRecord(
                    requirementId = row[DegreeRequirementsTable.id],
                    majorId = row[DegreeRequirementsTable.majorId],
                    categoryName = row[DegreeRequirementsTable.categoryName],
                    requiredUnits = row[DegreeRequirementsTable.requiredUnits]
                )
            }
    }

    fun findRequirementCourses(requirementIds: List<Int>): List<RequirementCourseRecord> = transaction(database) {
        if (requirementIds.isEmpty()) return@transaction emptyList()

        RequirementCoursesTable
            .selectAll()
            .where { RequirementCoursesTable.requirementId inList requirementIds }
            .map { row ->
                RequirementCourseRecord(
                    requirementId = row[RequirementCoursesTable.requirementId],
                    courseId = row[RequirementCoursesTable.courseId]
                )
            }
    }

    fun findCourses(courseIds: List<Int>): List<CatalogCourseRecord> = transaction(database) {
        if (courseIds.isEmpty()) return@transaction emptyList()

        CoursesTable
            .selectAll()
            .where { CoursesTable.id inList courseIds }
            .orderBy(CoursesTable.department to SortOrder.ASC)
            .orderBy(CoursesTable.courseCode to SortOrder.ASC)
            .map { row ->
                CatalogCourseRecord(
                    courseId = row[CoursesTable.id],
                    courseCode = row[CoursesTable.courseCode],
                    courseTitle = row[CoursesTable.courseTitle],
                    description = row[CoursesTable.description],
                    units = row[CoursesTable.units],
                    department = row[CoursesTable.department]
                )
            }
    }

    fun findPrerequisites(courseIds: List<Int>): List<RoadmapPrerequisiteRecord> = transaction(database) {
        if (courseIds.isEmpty()) return@transaction emptyList()

        PrerequisitesTable
            .selectAll()
            .where {
                (PrerequisitesTable.courseId inList courseIds)
                    .and(PrerequisitesTable.prereqCourseId inList courseIds)
            }
            .map { row ->
                RoadmapPrerequisiteRecord(
                    courseId = row[PrerequisitesTable.courseId],
                    prereqCourseId = row[PrerequisitesTable.prereqCourseId],
                    prereqType = row[PrerequisitesTable.prereqType]
                )
            }
    }

    private fun toMajorRecord(row: ResultRow): MajorRecord {
        return MajorRecord(
            majorId = row[MajorsTable.id],
            majorName = row[MajorsTable.majorName],
            department = row[MajorsTable.department],
            totalUnits = row[MajorsTable.totalUnits]
        )
    }
}
