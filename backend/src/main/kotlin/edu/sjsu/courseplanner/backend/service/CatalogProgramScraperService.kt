package edu.sjsu.courseplanner.backend.service

import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.springframework.stereotype.Service

data class ParsedCatalogProgram(
    val programKey: String,
    val sourceUrl: String,
    val majorName: String,
    val department: String,
    val totalUnits: Int,
    val requirements: List<ParsedCatalogRequirement>,
    val prerequisites: List<ParsedCatalogPrerequisite>
)

data class ParsedCatalogRequirement(
    val categoryName: String,
    val requiredUnits: Int,
    val courses: List<ParsedCatalogCourse>
)

data class ParsedCatalogCourse(
    val courseCode: String,
    val courseTitle: String,
    val units: Int,
    val department: String,
    val catalogCourseId: String?
)

data class ParsedCatalogPrerequisite(
    val courseCode: String,
    val prereqCourseCode: String,
    val prereqType: String
)

@Service
class CatalogProgramScraperService {
    private val supportedPrograms = mapOf(
        "cmpe" to "https://catalog.sjsu.edu/preview_program.php?catoid=15&poid=9494",
        "swe" to "https://catalog.sjsu.edu/preview_program.php?catoid=13&poid=7829&returnto=4973"
    )

    private val importedRequirementNames = listOf(
        "Major Preparation",
        "Core Courses",
        "Required Courses",
        "Major Courses",
        "Complete One Course From",
        "Approved Upper Division Electives"
    )

    fun supportedProgramKeys(): Set<String> = supportedPrograms.keys

    fun scrapeProgram(programKey: String): ParsedCatalogProgram {
        val normalizedKey = programKey.trim().lowercase()
        val url = supportedPrograms[normalizedKey]
            ?: throw IllegalArgumentException("Supported catalog programs are: ${supportedPrograms.keys.sorted().joinToString(", ")}")
        val document = Jsoup.connect(url)
            .userAgent("Mozilla/5.0")
            .timeout(30_000)
            .get()

        val requirements = parseRequirements(document)
        val prerequisites = requirements
            .flatMap { it.courses }
            .distinctBy { it.courseCode }
            .flatMap { parsePrerequisites(document, it) }

        return ParsedCatalogProgram(
            programKey = normalizedKey,
            sourceUrl = url,
            majorName = parseMajorName(document),
            department = parseDepartment(document),
            totalUnits = parseTotalUnits(document),
            requirements = requirements,
            prerequisites = prerequisites
        )
    }

    private fun parseMajorName(document: Document): String {
        return document.title()
            .substringAfter("Program:")
            .substringBefore(" - San")
            .trim()
            .ifBlank { "Unknown Major" }
    }

    private fun parseDepartment(document: Document): String {
        val departmentLinkText = document
            .selectFirst(".program_description a[href*=preview_entity]")
            ?.text()
            ?.trim()
            ?.removePrefix("Department of ")
            ?.trim()

        if (!departmentLinkText.isNullOrBlank()) return departmentLinkText

        val description = document.selectFirst(".program_description")?.text().orEmpty()
        return Regex("""Department of ([^.]+)""")
            .find(description)
            ?.groupValues
            ?.get(1)
            ?.trim()
            ?.substringBefore(",")
            ?.trim()
            ?: parseMajorName(document).substringBefore(",").trim()
    }

    private fun parseTotalUnits(document: Document): Int {
        val text = document.select("div.acalog-core h2").joinToString(" ") { it.text() }
        return Regex("""Total Units Required\s*\((\d+)\s+units\)""", RegexOption.IGNORE_CASE)
            .find(text)
            ?.groupValues
            ?.get(1)
            ?.toIntOrNull()
            ?: 120
    }

    private fun parseRequirements(document: Document): List<ParsedCatalogRequirement> {
        return document.select("div.acalog-core")
            .mapNotNull { core ->
                val heading = directHeading(core) ?: return@mapNotNull null
                val headingText = heading.text().trim()
                if (importedRequirementNames.none { headingText.contains(it, ignoreCase = true) }) return@mapNotNull null

                val courses = core.select("> ul > li.acalog-course")
                    .mapNotNull(::parseCourse)
                    .distinctBy { it.courseCode }

                if (courses.isEmpty()) return@mapNotNull null

                val unitsFromHeading = Regex("""\((\d+)\s+units\)""", RegexOption.IGNORE_CASE)
                    .find(headingText)
                    ?.groupValues
                    ?.get(1)
                    ?.toIntOrNull()

                ParsedCatalogRequirement(
                    categoryName = headingText.replace(Regex("""\s+"""), " "),
                    requiredUnits = unitsFromHeading ?: courses.sumOf { it.units },
                    courses = courses
                )
            }
    }

    private fun directHeading(core: Element): Element? {
        return core.children().firstOrNull { child ->
            child.tagName() == "h2" || child.tagName() == "h3" || child.tagName() == "h4"
        }
    }

    private fun parseCourse(courseElement: Element): ParsedCatalogCourse? {
        val link = courseElement.selectFirst("a[onclick*=showCourse], a[onClick*=showCourse]") ?: return null
        val label = link.text().replace('\u00a0', ' ').replace(Regex("""\s+"""), " ").trim()
        val courseCode = parseCourseCode(label) ?: return null
        val title = label.substringAfter(" - ", courseCode).trim().ifBlank { courseCode }
        val units = courseElement.select("em")
            .mapNotNull { it.text().trim().toIntOrNull() }
            .firstOrNull()
            ?: 0
        val catalogCourseId = Regex("""showCourse\('\d+',\s*'(\d+)'""")
            .find(link.attr("onclick").ifBlank { link.attr("onClick") })
            ?.groupValues
            ?.get(1)

        return ParsedCatalogCourse(
            courseCode = courseCode,
            courseTitle = title,
            units = units,
            department = courseCode.substringBefore(' '),
            catalogCourseId = catalogCourseId
        )
    }

    private fun parsePrerequisites(document: Document, course: ParsedCatalogCourse): List<ParsedCatalogPrerequisite> {
        val catoid = Regex("""catoid=(\d+)""").find(document.location())?.groupValues?.get(1)
            ?: Regex("""catoid=(\d+)""").find(document.baseUri())?.groupValues?.get(1)
            ?: return emptyList()
        val coid = course.catalogCourseId ?: return emptyList()
        val detail = Jsoup.connect("https://catalog.sjsu.edu/ajax/preview_course.php?catoid=$catoid&coid=$coid&display_options%5Blocation%5D=tooltip&show")
            .userAgent("Mozilla/5.0")
            .timeout(30_000)
            .get()
            .html()

        return parsePrerequisiteSection(detail, "Prerequisite(s):", "prereq", course.courseCode) +
            parsePrerequisiteSection(detail, "Corequisite(s):", "coreq", course.courseCode)
    }

    private fun parsePrerequisiteSection(html: String, label: String, type: String, courseCode: String): List<ParsedCatalogPrerequisite> {
        val labelIndex = html.indexOf(label)
        if (labelIndex < 0) return emptyList()

        val afterLabel = html.substring(labelIndex + label.length)
        val endIndex = listOf(
            afterLabel.indexOf("<br><strong>"),
            afterLabel.indexOf("<strong>Grading"),
            afterLabel.indexOf("<br><br><strong>")
        ).filter { it >= 0 }.minOrNull() ?: afterLabel.length
        val sectionHtml = afterLabel.substring(0, endIndex)

        return Jsoup.parse(sectionHtml)
            .select("a")
            .mapNotNull { parseCourseCode(it.text()) }
            .distinct()
            .filter { it != courseCode }
            .map { prereqCode ->
                ParsedCatalogPrerequisite(
                    courseCode = courseCode,
                    prereqCourseCode = prereqCode,
                    prereqType = type
                )
            }
    }

    private fun parseCourseCode(text: String): String? {
        val normalized = text.replace('\u00a0', ' ').replace(Regex("""\s+"""), " ").trim()
        val match = Regex("""^([A-Z]{2,5})\s+([0-9]{1,3}[A-Z]?)""").find(normalized.uppercase()) ?: return null
        return "${match.groupValues[1]} ${match.groupValues[2]}"
    }
}
