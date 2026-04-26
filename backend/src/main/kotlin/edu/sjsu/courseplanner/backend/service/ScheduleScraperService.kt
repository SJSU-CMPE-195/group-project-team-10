package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import org.jsoup.Jsoup
import org.springframework.stereotype.Service

// Fetches supported schedule pages and parses HTML table rows into structured data.
@Service
class ScheduleScraperService {

    private val scheduleUrls = mapOf(
        "spring 2026" to "https://sjsu.edu/classes/schedules/spring-2026.php",
        "fall 2026" to "https://sjsu.edu/classes/schedules/fall-2026.php"
    )
    private val sectionPattern = Regex("""^(.*?) \(Section ([^)]+)\)$""")
    private val classNumberPattern = Regex("""\d{5}""")

    // Returns only the successfully parsed rows, limited to the requested amount.
    fun scrapeSections(term: String = "Spring 2026", limit: Int = 10): List<ScrapedSectionDto> {
        return scrapeSectionsDebug(term, limit).parsed
    }

    // Returns parsed rows plus debug information about skipped rows and total coverage.
    fun scrapeSectionsDebug(term: String = "Spring 2026", limit: Int = 20): ScrapeDebugResult {
        val normalizedTerm = normalizeSupportedTerm(term)
        val doc = Jsoup.connect(scheduleUrls.getValue(normalizedTerm.lowercase()))
            .userAgent("Mozilla/5.0")
            .timeout(30_000)
            .get()

        val rows = doc.select("table tbody tr")
        val parsed = mutableListOf<ScrapedSectionDto>()
        val skipped = mutableListOf<List<String>>()

        for (row in rows) {
            val cells = row.select("td").map { it.text().trim() }

            if (cells.size < 13) {
                skipped.add(cells)
                continue
            }

            val match = sectionPattern.find(cells[0])
            val classNumber = cells[1]
            val units = cells[5].toDoubleOrNull()
            val openSeats = cells[12].toIntOrNull()

            if (
                match == null ||
                !classNumber.matches(classNumberPattern) ||
                units == null ||
                openSeats == null
            ) {
                skipped.add(cells)
                continue
            }

            val notes =
                if (cells.size > 13 && cells[13].isNotBlank()) listOf(cells[13])
                else emptyList()

            parsed.add(
                ScrapedSectionDto(
                    courseCode = match.groupValues[1].trim(),
                    sectionCode = match.groupValues[2].trim(),
                    classNumber = classNumber,
                    modeOfInstruction = cells[2],
                    title = cells[3],
                    satisfies = cells[4].ifBlank { null },
                    units = units,
                    type = cells[6],
                    days = cells[7],
                    times = cells[8],
                    instructor = cells[9],
                    location = cells[10],
                    dates = cells[11],
                    openSeats = openSeats,
                    notes = notes
                )
            )
        }

        return ScrapeDebugResult(
            totalRowsSeen = rows.size,
            parsedCount = parsed.size,
            skippedCount = skipped.size,
            parsed = parsed.take(limit),
            skippedRows = skipped.take(20)
        )
    }

    private fun normalizeSupportedTerm(term: String): String {
        val normalized = term.trim().replace(Regex("\\s+"), " ")
        require(scheduleUrls.containsKey(normalized.lowercase())) {
            "Supported terms are Spring 2026 and Fall 2026"
        }
        return normalized
    }
}
