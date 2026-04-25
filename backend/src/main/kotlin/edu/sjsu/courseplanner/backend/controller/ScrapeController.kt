package edu.sjsu.courseplanner.backend.controller

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.service.ScheduleScraperService
import edu.sjsu.courseplanner.backend.service.SectionService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity

// Exposes API endpoints for scraping and debugging the Fall 2026 schedule data.
@RestController
@RequestMapping("/api/scrape")
class ScrapeController(
    private val scheduleScraperService: ScheduleScraperService,
    private val sectionService: SectionService
) {

    // Returns a limited list of successfully parsed schedule rows.
    @GetMapping("/test")
    fun scrapeTest(
        @RequestParam(defaultValue = "20") limit: Int
    ): List<ScrapedSectionDto> {
        return scheduleScraperService.scrapeSections(limit)
    }

    // Returns scrape statistics plus samples of parsed and skipped rows for debugging.
    @GetMapping("/debug")
    fun scrapeDebug(
        @RequestParam(defaultValue = "20") limit: Int
    ): ScrapeDebugResult {
        return scheduleScraperService.scrapeSectionsDebug(limit)
    }

    // Scrapes the Fall 2026 page and saves the parsed rows into the database.
    @PostMapping("/import")
    fun importFall2026(): Map<String, Any> {
        val term = "Fall 2026"
        val scraped = scheduleScraperService.scrapeSectionsDebug(Int.MAX_VALUE).parsed
        val savedCount = sectionService.replaceSectionsForTerm(term, scraped)

        return mapOf(
            "term" to term,
            "scrapedCount" to scraped.size,
            "savedCount" to savedCount
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