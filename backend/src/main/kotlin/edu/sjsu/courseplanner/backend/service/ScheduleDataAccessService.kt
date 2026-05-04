package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.DepartmentCourseSummaryDto
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.dto.SectionScheduleRowDto
import edu.sjsu.courseplanner.backend.dto.SectionDto
import edu.sjsu.courseplanner.backend.repository.ScheduleDataRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/*
service layer that centralizes schedule data access by fetching, transforming, validating, and updating course
section data via the repository while converting it into schema-aligned DTOs for the API.
*/
@Service
class ScheduleDataAccessService(
    private val scheduleDataRepository: ScheduleDataRepository
) {

    // fetches all course sections (optionally by term) and converts them into DTOs for the frontend.
    @Transactional(readOnly = true)
    fun getFullSchedule(term: String? = null): List<SectionScheduleRowDto> {
        return scheduleDataRepository.findFullSchedule(normalizeOptionalTerm(term))
            .map(::toScheduleRow)
    }

    // retrieves sections for a department, groups them into courses, and returns summarized course-level data.
    @Transactional(readOnly = true)
    fun getCoursesByDepartment(department: String, term: String? = null): List<DepartmentCourseSummaryDto> {
        val normalizedDepartment = normalizeDepartment(department)
        return scheduleDataRepository.findByDepartment(normalizedDepartment, normalizeOptionalTerm(term))
            .groupBy { section -> section.term to section.courseCode }
            .values
            .map { sections ->
                val first = sections.first()
                val courseParts = splitCourseCode(first.courseCode)
                DepartmentCourseSummaryDto(
                    term = first.term,
                    department = courseParts.first,
                    courseNumber = courseParts.second,
                    courseCode = first.courseCode,
                    courseTitle = first.title,
                    totalSections = sections.size,
                    openSections = sections.count { it.openSeats > 0 }
                )
            }
            .sortedWith(
                compareBy<DepartmentCourseSummaryDto> { it.term }
                    .thenBy { it.courseNumber }
                    .thenBy { it.courseCode }
            )
    }

    // deletes all existing sections for a term and replaces them with validated scraped data.
    @Transactional
    fun replaceSectionsForTerm(term: String, scrapedSections: List<ScrapedSectionDto>): Int {
        val normalizedTerm = normalizeRequiredTerm(term)
        val entities = scrapedSections
            .map(::toValidatedEntityDraft)
            .distinctBy { it.classNumber }
            .map { entity -> entity.copy(term = normalizedTerm) }

        return scheduleDataRepository.replaceSectionsForTerm(normalizedTerm, entities)
    }

    // converts a SectionDto into a frontend-ready SectionScheduleRowDto.
    private fun toScheduleRow(section: SectionDto): SectionScheduleRowDto {
        val courseParts = splitCourseCode(section.courseCode)
        return SectionScheduleRowDto(
            term = section.term,
            department = courseParts.first,
            courseNumber = courseParts.second,
            courseCode = section.courseCode,
            courseTitle = section.title,
            sectionCode = section.sectionCode,
            classNumber = section.classNumber,
            modeOfInstruction = section.modeOfInstruction,
            satisfies = section.satisfies,
            units = section.units,
            type = section.type,
            days = section.days,
            times = section.times,
            instructor = section.instructor,
            location = section.location,
            dates = section.dates,
            openSeats = section.openSeats,
            notes = section.notes
        )
    }

    // cleans, validates, and converts scraped data into a SectionDto ready for saving.
    private fun toValidatedEntityDraft(dto: ScrapedSectionDto): SectionDto {
        val normalizedCourseCode = normalizeCourseCode(dto.courseCode)
        val courseParts = splitCourseCode(normalizedCourseCode)
        require(courseParts.first.isNotBlank() && courseParts.second.isNotBlank()) {
            "Course code must include both department and course number"
        }

        return SectionDto(
            term = "",
            courseCode = normalizedCourseCode,
            sectionCode = dto.sectionCode.trim(),
            classNumber = dto.classNumber.trim(),
            modeOfInstruction = dto.modeOfInstruction.trim(),
            title = dto.title.trim(),
            satisfies = dto.satisfies?.trim()?.ifBlank { null },
            units = dto.units,
            type = dto.type.trim(),
            days = dto.days.trim(),
            times = dto.times.trim(),
            instructor = dto.instructor.trim(),
            location = dto.location.trim(),
            dates = dto.dates.trim(),
            openSeats = dto.openSeats,
            notes = dto.notes.joinToString(" | ").trim().ifBlank { null }
        )
    }

    // standardizes and validates a department code (uppercase, 2–10 letters).
    private fun normalizeDepartment(department: String): String {
        val normalized = department.trim().uppercase()
        require(normalized.matches(Regex("[A-Z]{2,10}"))) {
            "Department must contain 2 to 10 letters"
        }
        return normalized
    }

    // trims the optional term filter and converts blank input into null.
    private fun normalizeOptionalTerm(term: String?): String? {
        return term?.trim()?.ifBlank { null }
    }

    // trims a required term value and rejects empty input.
    private fun normalizeRequiredTerm(term: String): String {
        return term.trim().ifBlank {
            throw IllegalArgumentException("Term is required")
        }
    }

    // collapses repeated spaces so course codes are stored and compared consistently.
    private fun normalizeCourseCode(courseCode: String): String {
        return courseCode.trim().replace(Regex("\\s+"), " ")
    }

    // splits a course code like "CMPE 195A" into department and course number parts.
    private fun splitCourseCode(courseCode: String): Pair<String, String> {
        val normalized = normalizeCourseCode(courseCode)
        val firstSpace = normalized.indexOf(' ')
        if (firstSpace <= 0 || firstSpace >= normalized.lastIndex) {
            return normalized.uppercase() to ""
        }

        return normalized.substring(0, firstSpace).uppercase() to normalized.substring(firstSpace + 1).trim()
    }
}
