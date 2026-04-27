package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.service.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/catalog")
class CatalogController(
    private val catalogService: CatalogService
) {

    @GetMapping("/courses")
    fun getCatalogCourses(
        @RequestParam(required = false) term: String?
    ) = catalogService.getCatalogCourses(term)

    @GetMapping("/terms")
    fun getAvailableTerms() = catalogService.getAvailableTerms()
}
