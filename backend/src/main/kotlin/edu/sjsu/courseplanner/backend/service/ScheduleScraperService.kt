package edu.sjsu.courseplanner.backend.service

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import org.jsoup.Jsoup
import org.jsoup.nodes.Element
import org.springframework.stereotype.Service
import java.io.File

@Service
class ScheduleScraperService {

    private val htmlPath = "data/fall-2026.html"
    private val sectionPattern = Regex("""^(.*?) \(Section ([^)]+)\)$""")
    private val classNumberPattern = Regex("""\d{5}""")

    fun scrapeSections(limit: Int = 10): List<ScrapedSectionDto> {
        return scrapeSectionsDebug(limit).parsed
    }

    fun scrapeSectionsDebug(limit: Int = 20): ScrapeDebugResult {
        val file = File(htmlPath)
        require(file.exists()) { "HTML file not found at: ${file.absolutePath}" }

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
}