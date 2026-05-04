package edu.sjsu.courseplanner.backend.repository

import edu.sjsu.courseplanner.backend.dto.SectionDto
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

/*
 Provides database access for saved section rows.
*/
@Repository
class SectionRepository(
    private val database: Database
) {
    fun findAll(): List<SectionDto> = transaction(database) {
        SectionsTable
            .selectAll()
            .orderBy(SectionsTable.term to SortOrder.ASC)
            .orderBy(SectionsTable.courseCode to SortOrder.ASC)
            .orderBy(SectionsTable.sectionCode to SortOrder.ASC)
            .map(::toSectionDto)
    }

    fun findByTerm(term: String): List<SectionDto> = transaction(database) {
        SectionsTable
            .selectAll()
            .andWhere { SectionsTable.term eq term }
            .orderBy(SectionsTable.courseCode to SortOrder.ASC)
            .orderBy(SectionsTable.sectionCode to SortOrder.ASC)
            .map(::toSectionDto)
    }

    fun deleteAllByTerm(term: String): Int = transaction(database) {
        SectionsTable.deleteWhere { SectionsTable.term eq term }
    }

    fun replaceSectionsForTerm(term: String, sections: List<SectionDto>): Int = transaction(database) {
        SectionsTable.deleteWhere { SectionsTable.term eq term }
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
        sections.size
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
