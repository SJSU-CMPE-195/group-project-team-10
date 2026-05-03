package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.SectionDto
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.deleteAll
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.stereotype.Repository

/*
that provides database queries to fetch and delete course schedule data (sections), including filtering
by term and department.
*/
@Repository
class ScheduleDataRepository(
    private val database: Database
) {

    // returns all course sections from the database, optionally filtered by term, and sorted.
    fun findFullSchedule(term: String?): List<SectionDto> = transaction(database) {
        SectionsTable
            .selectAll()
            .apply {
                if (term != null) {
                    andWhere { SectionsTable.term eq term }
                }
            }
            .orderBy(SectionsTable.term to SortOrder.ASC)
            .orderBy(SectionsTable.courseCode to SortOrder.ASC)
            .orderBy(SectionsTable.sectionCode to SortOrder.ASC)
            .orderBy(SectionsTable.classNumber to SortOrder.ASC)
            .map(::toSectionDto)
    }

    // returns all course sections for a specific department (and optional term) using a LIKE match on course code.
    fun findByDepartment(
        department: String,
        term: String?
    ): List<SectionDto> = transaction(database) {
        val departmentPrefix = "$department %"

        SectionsTable
            .selectAll()
            .andWhere { SectionsTable.courseCode like departmentPrefix }
            .apply {
                if (term != null) {
                    andWhere { SectionsTable.term eq term }
                }
            }
            .orderBy(SectionsTable.term to SortOrder.ASC)
            .orderBy(SectionsTable.courseCode to SortOrder.ASC)
            .orderBy(SectionsTable.sectionCode to SortOrder.ASC)
            .orderBy(SectionsTable.classNumber to SortOrder.ASC)
            .map(::toSectionDto)
    }

    // deletes all course sections in the database that belong to a specific term
    fun deleteScheduleForTerm(term: String): Int = transaction(database) {
        SectionsTable.deleteWhere { SectionsTable.term eq term }
    }

    fun replaceSectionsForTerm(term: String, sections: List<SectionDto>): Int = transaction(database) {
        SectionsTable.deleteWhere { SectionsTable.term eq term }
        insertSections(sections)
        sections.size
    }

    fun deleteAll() {
        transaction(database) {
            SectionsTable.deleteAll()
        }
    }

    fun saveAll(sections: List<SectionDto>): List<SectionDto> = transaction(database) {
        insertSections(sections)
        sections
    }

    private fun insertSections(sections: List<SectionDto>) {
        sections.forEach { section ->
            SectionsTable.insert { statement ->
                statement[SectionsTable.term] = section.term
                statement[SectionsTable.courseCode] = section.courseCode
                statement[SectionsTable.sectionCode] = section.sectionCode
                statement[SectionsTable.classNumber] = section.classNumber
                statement[SectionsTable.modeOfInstruction] = section.modeOfInstruction
                statement[SectionsTable.title] = section.title
                statement[SectionsTable.satisfies] = section.satisfies
                statement[SectionsTable.units] = section.units
                statement[SectionsTable.type] = section.type
                statement[SectionsTable.days] = section.days
                statement[SectionsTable.times] = section.times
                statement[SectionsTable.instructor] = section.instructor
                statement[SectionsTable.location] = section.location
                statement[SectionsTable.dates] = section.dates
                statement[SectionsTable.openSeats] = section.openSeats
                statement[SectionsTable.notes] = section.notes
            }
        }
    }

    private fun toSectionDto(row: ResultRow): SectionDto {
        return SectionDto(
            id = row[SectionsTable.id],
            term = row[SectionsTable.term],
            courseCode = row[SectionsTable.courseCode],
            sectionCode = row[SectionsTable.sectionCode],
            classNumber = row[SectionsTable.classNumber],
            modeOfInstruction = row[SectionsTable.modeOfInstruction],
            title = row[SectionsTable.title],
            satisfies = row[SectionsTable.satisfies],
            units = row[SectionsTable.units],
            type = row[SectionsTable.type],
            days = row[SectionsTable.days],
            times = row[SectionsTable.times],
            instructor = row[SectionsTable.instructor],
            location = row[SectionsTable.location],
            dates = row[SectionsTable.dates],
            openSeats = row[SectionsTable.openSeats],
            notes = row[SectionsTable.notes]
        )
    }
}
