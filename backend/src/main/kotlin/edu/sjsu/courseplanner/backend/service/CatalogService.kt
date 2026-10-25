package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.CatalogCourseDto
import edu.sjsu.courseplanner.backend.repository.CatalogRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CatalogService(
    private val catalogRepository: CatalogRepository
) {

    @Transactional(readOnly = true)
    fun getCatalogCourses(term: String? = null): List<CatalogCourseDto> {
        val courses = catalogRepository.findAllCourses()
        val allOfferings = catalogRepository.findOfferings()
        val filteredOfferings = catalogRepository.findOfferings(term)
        val geValues = catalogRepository.findCourseGeValues()

        val termsByCourseId = allOfferings
            .groupBy { it.courseId }
            .mapValues { (_, offerings) ->
                offerings
                    .map { it.term }
                    .distinct()
                    .sorted()
            }

        val offeringCountByCourseId = filteredOfferings
            .groupingBy { it.courseId }
            .eachCount()

        val geAreasByCourseCode = geValues
            .groupBy { it.courseCode.trim().uppercase() }
            .mapValues { (_, records) ->
                records
                    .flatMap { GeAreaParser.parse(it.satisfies) }
                    .distinct()
                    .sorted()
            }

        return courses
            .map { course ->
                CatalogCourseDto(
                    courseId = course.courseId,
                    courseCode = course.courseCode,
                    courseTitle = course.courseTitle,
                    description = course.description,
                    units = course.units,
                    department = course.department,
                    offeringCount = offeringCountByCourseId[course.courseId] ?: 0,
                    availableTerms = termsByCourseId[course.courseId] ?: emptyList(),
                    geAreas = geAreasByCourseCode[
                        course.courseCode.trim().uppercase()
                    ] ?: emptyList()
                )
            }
            .filter { dto ->
                term.isNullOrBlank() || dto.offeringCount > 0
            }
    }

    @Transactional(readOnly = true)
    fun getAvailableTerms(): List<String> {
        return catalogRepository.findAvailableTerms()
    }

}
