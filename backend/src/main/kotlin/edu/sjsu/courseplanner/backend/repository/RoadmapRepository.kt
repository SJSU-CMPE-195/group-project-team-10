package edu.sjsu.courseplanner.backend.repository
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
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
    val totalUnits: Int,
    val catalogProgramKey: String?,
    val catalogSourceUrl: String?,
    val catalogYear: Int?
)
data class RequirementRecord(
    val requirementId: Int,
    val majorId: Int,
    val categoryName: String,
    val requiredUnits: Int,
    val notes: String?,
    val sourceUrl: String?
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
data class RoadmapPrerequisiteConditionRecord(
    val courseId: Int,
    val relationshipType: String,
    val originalText: String,
    val expressionJson: String?,
    val sourceUrl: String?
)
data class SageProgramRecord(
    val sageProgramId: Int,
    val undergraduateMajorId: Int,
    val graduateProgramName: String,
    val minimumGpa: Double,
    val minimumUndergradUnits: Int,
    val maximumUndergradUnits: Int,
    val totalProgramUnits: Int,
    val maxDoubleCountUnits: Int
)
data class SageRequirementRecord(
    val requirementId: Int,
    val sageProgramId: Int,
    val requirementName: String,
    val requiredUnits: Int,
    val description: String?
)
data class SageCourseRecord(
    val courseId: Int,
    val courseCode: String,
    val courseTitle: String,
    val units: Int,
    val courseRole: String,
    val doubleCountEligible: Boolean
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
                    requiredUnits = row[DegreeRequirementsTable.requiredUnits],
                    notes = row[DegreeRequirementsTable.notes],
                    sourceUrl = row[DegreeRequirementsTable.sourceUrl]
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
            .where { PrerequisitesTable.courseId inList courseIds }
            .map { row ->
                RoadmapPrerequisiteRecord(
                    courseId = row[PrerequisitesTable.courseId],
                    prereqCourseId = row[PrerequisitesTable.prereqCourseId],
                    prereqType = row[PrerequisitesTable.prereqType]
                )
            }
    }
    fun findPrerequisiteConditions(courseIds: List<Int>): List<RoadmapPrerequisiteConditionRecord> = transaction(database) {
        if (courseIds.isEmpty()) return@transaction emptyList()
        PrerequisiteCsvConditionsTable
            .selectAll()
            .where { PrerequisiteCsvConditionsTable.courseId inList courseIds }
            .map { row ->
                RoadmapPrerequisiteConditionRecord(
                    courseId = row[PrerequisiteCsvConditionsTable.courseId],
                    relationshipType = row[PrerequisiteCsvConditionsTable.relationshipType],
                    originalText = row[PrerequisiteCsvConditionsTable.originalText],
                    expressionJson = row[PrerequisiteCsvConditionsTable.expressionJson],
                    sourceUrl = row[PrerequisiteCsvConditionsTable.officialCourseUrl]
                )
            }
    }
    fun findSageProgramsForMajor(
        majorId: Int
    ): List<SageProgramRecord> = transaction(database) {
        SageProgramsTable
            .selectAll()
            .where { SageProgramsTable.undergraduateMajorId eq majorId }
            .orderBy(SageProgramsTable.graduateProgramName to SortOrder.ASC)
            .map { row ->
                SageProgramRecord(
                    sageProgramId = row[SageProgramsTable.id],
                    undergraduateMajorId = row[SageProgramsTable.undergraduateMajorId],
                    graduateProgramName = row[SageProgramsTable.graduateProgramName],
                    minimumGpa = row[SageProgramsTable.minimumGpa],
                    minimumUndergradUnits = row[SageProgramsTable.minimumUndergradUnits],
                    maximumUndergradUnits = row[SageProgramsTable.maximumUndergradUnits],
                    totalProgramUnits = row[SageProgramsTable.totalProgramUnits],
                    maxDoubleCountUnits = row[SageProgramsTable.maxDoubleCountUnits]
                )
            }
    }
    fun findSageRequirements(
        sageProgramId: Int
    ): List<SageRequirementRecord> = transaction(database) {
        SageRequirementsTable
            .selectAll()
            .where { SageRequirementsTable.sageProgramId eq sageProgramId }
            .orderBy(SageRequirementsTable.id to SortOrder.ASC)
            .map { row ->
                SageRequirementRecord(
                    requirementId = row[SageRequirementsTable.id],
                    sageProgramId = row[SageRequirementsTable.sageProgramId],
                    requirementName = row[SageRequirementsTable.requirementName],
                    requiredUnits = row[SageRequirementsTable.requiredUnits],
                    description = row[SageRequirementsTable.description]
                )
            }
    }
    fun findSageCourses(
        requirementId: Int
    ): List<SageCourseRecord> = transaction(database) {
        SageCoursesTable
            .selectAll()
            .where { SageCoursesTable.requirementId eq requirementId }
            .orderBy(SageCoursesTable.courseId to SortOrder.ASC)
            .map { row ->
                val courseId = row[SageCoursesTable.courseId]
                val course = CoursesTable
                    .selectAll()
                    .where { CoursesTable.id eq courseId }
                    .single()
                SageCourseRecord(
                    courseId = course[CoursesTable.id],
                    courseCode = course[CoursesTable.courseCode],
                    courseTitle = course[CoursesTable.courseTitle],
                    units = course[CoursesTable.units],
                    courseRole = row[SageCoursesTable.courseRole],
                    doubleCountEligible = row[SageCoursesTable.doubleCountEligible]
                )
            }
    }
    private fun toMajorRecord(row: ResultRow): MajorRecord {
        return MajorRecord(
            majorId = row[MajorsTable.id],
            majorName = row[MajorsTable.majorName],
            department = row[MajorsTable.department],
            totalUnits = row[MajorsTable.totalUnits],
            catalogProgramKey = row[MajorsTable.catalogProgramKey],
            catalogSourceUrl = row[MajorsTable.catalogSourceUrl],
            catalogYear = row[MajorsTable.catalogYear]
        )
    }
}
