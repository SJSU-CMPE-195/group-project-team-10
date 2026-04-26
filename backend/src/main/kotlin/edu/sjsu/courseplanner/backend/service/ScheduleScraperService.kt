package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import org.jsoup.Jsoup
import org.jsoup.nodes.Element
import org.springframework.stereotype.Service
import java.io.File

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

        val doc = Jsoup.parse(file, "UTF-8")

        val rows = doc.select("#classSchedule tbody tr")
        val parsed = mutableListOf<ScrapedSectionDto>()
        val skipped = mutableListOf<List<String>>()

        for (row in rows) {
            val cells = row.select("td").map { td ->
                cleanCellText(td)
            }

            if (cells.size < 13) {
                skipped.add(cells)
                continue
            }

            val match = sectionPattern.find(cells[0])
            if (match == null) {
                skipped.add(cells)
                continue
            }

            val classNumber = cells[1].trim()
            if (!classNumber.matches(classNumberPattern)) {
                skipped.add(cells)
                continue
            }

            val units = cells[5]
                .replace(Regex("[^0-9.]"), "")
                .toDoubleOrNull() ?: 0.0

            val openSeats = cells[12]
                .replace(Regex("[^0-9-]"), "")
                .toIntOrNull() ?: 0

            val notes = extractNotes(cells.getOrNull(13).orEmpty())

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
                    days = normalizeWhitespace(cells[7]),
                    times = normalizeWhitespace(cells[8]),
                    instructor = normalizeWhitespace(cells[9]),
                    location = normalizeWhitespace(cells[10]),
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

    private fun cleanCellText(td: Element): String {
        td.select("br").append("\\n")
        return td.text()
            .replace("\\n", "\n")
            .replace('\u00A0', ' ')
            .trim()
    }

    private fun normalizeWhitespace(value: String): String {
        return value
            .lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .joinToString(" | ")
    }

    private fun extractNotes(raw: String): List<String> {
        return raw.lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }
    }

    private fun csvEscape(value: String): String {
        val escaped = value.replace("\"", "\"\"")
        return "\"$escaped\""
    }

    fun exportSectionsToCsv(rows: List<ScrapedSectionDto>): String {
        val header = listOf(
            "courseCode",
            "sectionCode",
            "classNumber",
            "modeOfInstruction",
            "title",
            "satisfies",
            "units",
            "type",
            "days",
            "times",
            "instructor",
            "location",
            "dates",
            "openSeats",
            "notes"
        ).joinToString(",")

        val body = rows.joinToString("\n") { row ->
            listOf(
                csvEscape(row.courseCode),
                csvEscape(row.sectionCode),
                csvEscape(row.classNumber),
                csvEscape(row.modeOfInstruction),
                csvEscape(row.title),
                csvEscape(row.satisfies ?: ""),
                row.units.toString(),
                csvEscape(row.type),
                csvEscape(row.days),
                csvEscape(row.times),
                csvEscape(row.instructor),
                csvEscape(row.location),
                csvEscape(row.dates),
                row.openSeats.toString(),
                csvEscape(row.notes.joinToString(" | "))
            ).joinToString(",")
        }

        return "$header\n$body"
    }
    
    private fun normalizeSupportedTerm(term: String): String {
        val normalized = term.trim().replace(Regex("\\s+"), " ")
        require(scheduleUrls.containsKey(normalized.lowercase())) {
            "Supported terms are Spring 2026 and Fall 2026"
        }
        return normalized
    }
}
