package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.model.SectionEntity
import edu.sjsu.courseplanner.backend.repository.SectionRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/*
 Converts scraped DTOs into database entities and manages section persistence.
*/
@Service
class SectionService(
    private val sectionRepository: SectionRepository
) {

    // Returns all saved sections.
    fun getAllSections(): List<SectionEntity> {
        return sectionRepository.findAll()
    }

    // Returns saved sections for one term.
    fun getSectionsByTerm(term: String): List<SectionEntity> {
        return sectionRepository.findByTerm(term)
    }

    // Replaces all saved rows for a term with the latest scraped results.
    @Transactional
    fun replaceSectionsForTerm(term: String, scraped: List<ScrapedSectionDto>): Int {
        val entities = scraped.map { dto ->
            SectionEntity(
                term = term,
                courseCode = dto.courseCode,
                sectionCode = dto.sectionCode,
                classNumber = dto.classNumber,
                modeOfInstruction = dto.modeOfInstruction,
                title = dto.title,
                satisfies = dto.satisfies,
                units = dto.units,
                type = dto.type,
                days = dto.days,
                times = dto.times,
                instructor = dto.instructor,
                location = dto.location,
                dates = dto.dates,
                openSeats = dto.openSeats,
                notes = dto.notes.joinToString(" | ").ifBlank { null }
            )
        }

        return sectionRepository.replaceSectionsForTerm(term, entities)
    }
}
