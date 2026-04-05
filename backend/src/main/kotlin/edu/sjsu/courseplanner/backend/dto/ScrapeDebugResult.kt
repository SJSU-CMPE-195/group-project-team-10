package edu.sjsu.courseplanner.backend.dto

// Stores scrape summary information for debugging parser coverage and skipped rows.
data class ScrapeDebugResult(
    val totalRowsSeen: Int,
    val parsedCount: Int,
    val skippedCount: Int,
    val parsed: List<ScrapedSectionDto>,
    val skippedRows: List<List<String>>
)