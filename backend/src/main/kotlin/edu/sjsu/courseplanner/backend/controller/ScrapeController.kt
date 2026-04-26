package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.service.ScheduleImportService
import edu.sjsu.courseplanner.backend.service.ScheduleScraperService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

// Exposes API endpoints for scraping and debugging supported schedule terms.
@RestController
@RequestMapping("/api/scrape")
class ScrapeController(
    private val scheduleScraperService: ScheduleScraperService,
    private val scheduleImportService: ScheduleImportService
) {

    // Returns a limited list of successfully parsed schedule rows.
    @GetMapping("/test")
    fun scrapeTest(
        @RequestParam(defaultValue = "Spring 2026") term: String,
        @RequestParam(defaultValue = "20") limit: Int
    ): List<ScrapedSectionDto> {
        return scheduleScraperService.scrapeSections(term, limit)
    }

    // Returns scrape statistics plus samples of parsed and skipped rows for debugging.
    @GetMapping("/debug")
    fun scrapeDebug(
        @RequestParam(defaultValue = "Spring 2026") term: String,
        @RequestParam(defaultValue = "40") limit: Int
    ): ScrapeDebugResult {
        return scheduleScraperService.scrapeSectionsDebug(term, limit)
    }

    // Scrapes a supported term page and saves the parsed rows into the database.
    @PostMapping("/import")
    fun importTerm(
        @RequestParam(defaultValue = "Spring 2026") term: String
    ): Map<String, Any> {
        val scraped = scheduleScraperService.scrapeSectionsDebug(term, Int.MAX_VALUE).parsed
        val result = scheduleImportService.importScrapedTerm(term, scraped)

        return mapOf(
            "term" to result.term,
            "scrapedCount" to scraped.size,
            "coursesCreated" to result.coursesCreated,
            "instructorsCreated" to result.instructorsCreated,
            "offeringsSaved" to result.offeringsSaved,
            "sectionsSaved" to result.sectionsSaved
        )
    }

    // Scrapes the Fall 2026 page and returns the parsed rows as a downloadable CSV file.
    @GetMapping("/export")
    fun exportFall2026Csv(): ResponseEntity<String> {
        val scraped = scheduleScraperService.scrapeSectionsDebug(Int.MAX_VALUE).parsed
        val csv = scheduleScraperService.exportSectionsToCsv(scraped)

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=fall_2026_schedule.csv")
            .contentType(MediaType("text", "csv"))
            .body(csv)
    }
}
