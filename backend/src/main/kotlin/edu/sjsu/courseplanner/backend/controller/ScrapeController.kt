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

// Exposes API endpoints for scraping and debugging the Spring 2026 schedule data.
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

    // Scrapes the Spring 2026 page and saves the parsed rows into the database.
    @PostMapping("/import")
    fun importSpring2026(): Map<String, Any> {
        val term = "Spring 2026"
        val scraped = scheduleScraperService.scrapeSectionsDebug(Int.MAX_VALUE).parsed
        val savedCount = sectionService.replaceSectionsForTerm(term, scraped)

        return mapOf(
            "term" to term,
            "scrapedCount" to scraped.size,
            "savedCount" to savedCount
        )
    }
}