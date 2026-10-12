package edu.sjsu.courseplanner.backend.repository

import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository

@Repository
class SageRepository(
    private val database: Database
) {

    fun findMajorIdByName(
        majorName: String
    ): Int? = transaction(database) {

        MajorsTable
            .selectAll()
            .where {
                MajorsTable.majorName like "%$majorName%"
            }
            .firstOrNull()
            ?.get(MajorsTable.id)
    }

    fun ensureSageProgram(
        undergraduateMajorId: Int,
        graduateProgramName: String,
        minimumGpa: Double,
        minimumUndergradUnits: Int,
        maximumUndergradUnits: Int,
        totalProgramUnits: Int
    ): Int = transaction(database) {

        val existing = SageProgramsTable
            .selectAll()
            .where {
                (SageProgramsTable.undergraduateMajorId eq undergraduateMajorId) and
                        (SageProgramsTable.graduateProgramName eq graduateProgramName)
            }
            .firstOrNull()

        if (existing != null) {

            val programId = existing[SageProgramsTable.id]

            SageProgramsTable.update({
                SageProgramsTable.id eq programId
            }) { row ->

                row[SageProgramsTable.minimumGpa] =
                    minimumGpa

                row[SageProgramsTable.minimumUndergradUnits] =
                    minimumUndergradUnits

                row[SageProgramsTable.maximumUndergradUnits] =
                    maximumUndergradUnits

                row[SageProgramsTable.totalProgramUnits] =
                    totalProgramUnits

                row[SageProgramsTable.maxDoubleCountUnits] =
                    12
            }

            return@transaction programId
        }

        SageProgramsTable.insert { row ->

            row[SageProgramsTable.undergraduateMajorId] =
                undergraduateMajorId

            row[SageProgramsTable.graduateProgramName] =
                graduateProgramName

            row[SageProgramsTable.minimumGpa] =
                minimumGpa

            row[SageProgramsTable.minimumUndergradUnits] =
                minimumUndergradUnits

            row[SageProgramsTable.maximumUndergradUnits] =
                maximumUndergradUnits

            row[SageProgramsTable.totalProgramUnits] =
                totalProgramUnits

            row[SageProgramsTable.maxDoubleCountUnits] =
                12
        }

        SageProgramsTable
            .selectAll()
            .where {
                (SageProgramsTable.undergraduateMajorId eq undergraduateMajorId) and
                        (SageProgramsTable.graduateProgramName eq graduateProgramName)
            }
            .first()[SageProgramsTable.id]
    }

    fun ensureSageRequirement(
        sageProgramId: Int,
        requirementName: String,
        requiredUnits: Int,
        description: String?
    ): Int = transaction(database) {

        val existing = SageRequirementsTable
            .selectAll()
            .where {
                (SageRequirementsTable.sageProgramId eq sageProgramId) and
                        (SageRequirementsTable.requirementName eq requirementName)
            }
            .firstOrNull()

        if (existing != null) {

            val requirementId =
                existing[SageRequirementsTable.id]

            SageRequirementsTable.update({
                SageRequirementsTable.id eq requirementId
            }) { row ->

                row[SageRequirementsTable.requiredUnits] =
                    requiredUnits

                row[SageRequirementsTable.description] =
                    description
            }

            return@transaction requirementId
        }

        SageRequirementsTable.insert { row ->

            row[SageRequirementsTable.sageProgramId] =
                sageProgramId

            row[SageRequirementsTable.requirementName] =
                requirementName

            row[SageRequirementsTable.requiredUnits] =
                requiredUnits

            row[SageRequirementsTable.description] =
                description
        }

        SageRequirementsTable
            .selectAll()
            .where {
                (SageRequirementsTable.sageProgramId eq sageProgramId) and
                        (SageRequirementsTable.requirementName eq requirementName)
            }
            .first()[SageRequirementsTable.id]
    }

    fun ensureCourse(
        courseCode: String,
        courseTitle: String
    ): Int = transaction(database) {

        val existing = CoursesTable
            .selectAll()
            .where {
                CoursesTable.courseCode eq courseCode
            }
            .firstOrNull()

        if (existing != null) {
            return@transaction existing[CoursesTable.id]
        }

        val department =
            courseCode.substringBefore(" ")

        CoursesTable.insert { row ->

            row[CoursesTable.courseCode] =
                courseCode

            row[CoursesTable.courseTitle] =
                courseTitle

            row[CoursesTable.units] =
                3

            row[CoursesTable.department] =
                department
        }

        CoursesTable
            .selectAll()
            .where {
                CoursesTable.courseCode eq courseCode
            }
            .first()[CoursesTable.id]
    }

    fun ensureSageCourse(
        requirementId: Int,
        courseId: Int,
        courseRole: String,
        doubleCountEligible: Boolean
    ) = transaction(database) {

        val existing = SageCoursesTable
            .selectAll()
            .where {
                (SageCoursesTable.requirementId eq requirementId) and
                        (SageCoursesTable.courseId eq courseId) and
                        (SageCoursesTable.courseRole eq courseRole)
            }
            .firstOrNull()

        if (existing == null) {

            SageCoursesTable.insert { row ->

                row[SageCoursesTable.requirementId] =
                    requirementId

                row[SageCoursesTable.courseId] =
                    courseId

                row[SageCoursesTable.courseRole] =
                    courseRole

                row[SageCoursesTable.doubleCountEligible] =
                    doubleCountEligible
            }

        } else {

            SageCoursesTable.update({
                (SageCoursesTable.requirementId eq requirementId) and
                        (SageCoursesTable.courseId eq courseId) and
                        (SageCoursesTable.courseRole eq courseRole)
            }) { row ->

                row[SageCoursesTable.doubleCountEligible] =
                    doubleCountEligible
            }
        }
    }
}