package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.dto.SectionDto
import edu.sjsu.courseplanner.backend.service.SectionService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/*
 Exposes API endpoints for reading saved section data from the database.
*/
@RestController
@RequestMapping("/api/sections")
class SectionController(
    private val sectionService: SectionService
) {

    // Returns all saved sections, or only sections for a specific term if provided.
    @GetMapping
    fun getSections(
        @RequestParam(required = false) term: String?
    ): List<SectionDto> {
        return if (term.isNullOrBlank()) {
            sectionService.getAllSections()
        } else {
            sectionService.getSectionsByTerm(term)
        }
    }
}