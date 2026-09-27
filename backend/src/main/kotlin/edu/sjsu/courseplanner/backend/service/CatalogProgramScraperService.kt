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
        "cmpe" to "data/major_requirements/CMPE_BS.html",
        "swe" to "data/major_requirements/SWE_BS.html"
    )

    private val importedRequirementNames = listOf(
        "major preparation",
        "core courses",
        "required courses",
        "major courses",
        "complete one course from",
        "approved upper division electives",
        "lower division",
        "upper division",
        "senior design",
        "general education",
        "electives",
        "university elective"
    )

    private val originalCatalogSourceUrls = mapOf(
        "cmpe" to "https://catalog.sjsu.edu/pdp/?catalog=10&program=6077",
        "swe" to "https://catalog.sjsu.edu/pdp/?catalog=10&program=6420"
    )

    fun supportedProgramKeys(): Set<String> = supportedPrograms.keys

    fun scrapeProgram(programKey: String): ParsedCatalogProgram {
        val normalizedKey = programKey.trim().lowercase()
        val url = supportedPrograms[normalizedKey]
            ?: throw IllegalArgumentException("Supported catalog programs are: ${supportedPrograms.keys.sorted().joinToString(", ")}")

        val document = fetchDocument(url)
        val originalSourceUrl = originalCatalogSourceUrls[normalizedKey] ?: url
        val requirements = parseRequirements(document)
        val prerequisites = requirements
            .flatMap { it.courses }
            .distinctBy { it.courseCode }
            .flatMap { parsePrerequisites(originalSourceUrl, it) }

        return ParsedCatalogProgram(
            programKey = normalizedKey,
            sourceUrl = originalSourceUrl,
            majorName = parseMajorName(document),
            department = parseDepartment(document),
            totalUnits = parseTotalUnits(document),
            requirements = requirements,
            prerequisites = prerequisites
        )
    }

    private fun fetchDocument(url: String): Document {
        // If this looks like an HTTP/HTTPS URL, fetch remotely.
        if (url.startsWith("http://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
            val response = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .referrer("https://catalog.sjsu.edu/")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .timeout(30_000)
                .execute()

            val body = response.body()
            if (response.statusCode() >= 400 || body.isBlank()) {
                throw IllegalStateException(
                    "Catalog page was rejected by SJSU (HTTP ${response.statusCode()}) while fetching $url. " +
                        "This usually means the catalog is returning a WAF/challenge page instead of the program HTML."
                )
            }

            return Jsoup.parse(body)
        }

        // Treat the provided string as a local file path. Try several relative locations so the service works
        // when the backend is started from backend/ (./gradlew bootRun) or from the project root.
        val candidatePaths = listOf(
            java.io.File(url),
            java.io.File("./$url"),
            java.io.File("../$url"),
            java.io.File("../../$url")
        )

        val existing = candidatePaths.firstOrNull { it.exists() && it.isFile }
        if (existing != null) {
            return Jsoup.parse(existing, "UTF-8")
        }

        // If no local file found, attempt a remote fetch as a last resort (preserves backward compatibility).
        try {
            val response = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .referrer("https://catalog.sjsu.edu/")
                .timeout(30_000)
                .execute()
            val body = response.body()
            return Jsoup.parse(body)
        } catch (ex: Exception) {
            throw IllegalArgumentException("The supplied URL or file path '$url' could not be loaded as a local file or remote URL.", ex)
        }
    }

    private fun parseMajorName(document: Document): String {
        return document.selectFirst("#program-name")
            ?.text()
            ?.trim()
            ?: "Unknown Major"
    }

    private fun parseDepartment(document: Document): String {
        return document.selectFirst(".masthead__department")
            ?.text()
            ?.trim()
            ?: "Unknown Department"
    }

    private fun parseTotalUnits(document: Document): Int {
        // Prefer an explicit heading that contains "Total Units Required"
        val totalHeading = document.select("h2.core__name, h2.core__name, h2").firstOrNull { it.text().contains("Total Units Required", ignoreCase = true) }
            ?: document.select("p, div, span").firstOrNull { it.text().contains("Total Units Required", ignoreCase = true) }

        totalHeading?.let { el ->
            val match = Regex("""(\d+)\s*(?:units?|credits?)""", RegexOption.IGNORE_CASE).find(el.text())
            if (match != null) return match.groupValues[1].toIntOrNull() ?: 120
        }

        // Fallback to scanning the full document text
        val text = document.text()
        val directMatch = Regex("""(?:Total\s+Units?\s+Required|Total\s+Units?)\s*\(?\s*(\d+)\s*(?:units?|credits?)""", RegexOption.IGNORE_CASE)
            .find(text)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
        if (directMatch != null) return directMatch

        val fallback = Regex("""(\d+)\s*(?:units?|credits?)""", RegexOption.IGNORE_CASE)
            .find(text)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
        return fallback ?: 120
    }

    private fun parseRequirements(document: Document): List<ParsedCatalogRequirement> {
        val requirements = mutableListOf<ParsedCatalogRequirement>()

        val cores = document.select("div.core")
        for (core in cores) {
            val headingEl = core.selectFirst(".core__name")
            val headingText = headingEl?.text()?.let(::normalizeText) ?: ""
            if (headingText.isBlank()) continue

            val isSummaryOrGeneral = headingText.contains("Total Units Required", ignoreCase = true)
                || headingText.contains("Summary of Degree Units", ignoreCase = true)
                || headingText.contains("Complete the Baccalaureate Degree Requirements", ignoreCase = true)
            val hasCourseChildren = !core.select(".core__child-courses .course, .core__courses .course").isEmpty()

            // Exclude summary headings and general degree requirement blocks that are not true major categories.
            if (isSummaryOrGeneral && !hasCourseChildren) continue

            val children = core.select(".core__child")
            if (children.isNotEmpty()) {
                for (child in children) {
                    val childHeadingEl = child.selectFirst(".core__child-name") ?: continue
                    val childHeadingText = normalizeText(childHeadingEl.text())
                    if (childHeadingText.isBlank()) continue

                    val childIsSummary = childHeadingText.contains("Total Units Required", ignoreCase = true)
                        || childHeadingText.contains("Summary of Degree Units", ignoreCase = true)
                    if (childIsSummary) continue

                    val units = Regex("""\((\d+)\s+units?\)""", RegexOption.IGNORE_CASE)
                        .find(childHeadingText)
                        ?.groupValues
                        ?.getOrNull(1)
                        ?.toIntOrNull() ?: 0

                    val courseDivs = child.select(".core__child-courses .course")
                    val courses = courseDivs.mapNotNull { parseCourseDiv(it) }.distinctBy { it.courseCode }

                    requirements.add(
                        ParsedCatalogRequirement(
                            categoryName = childHeadingText.replace(Regex("""\s+"""), " ").trim(),
                            requiredUnits = units,
                            courses = courses
                        )
                    )
                }
            } else {
                val units = Regex("""\((\d+)\s+units?\)""", RegexOption.IGNORE_CASE)
                    .find(headingText)
                    ?.groupValues
                    ?.getOrNull(1)
                    ?.toIntOrNull() ?: 0

                val courseDivs = core.select(".core__courses .course")
                val courses = courseDivs.mapNotNull { parseCourseDiv(it) }.distinctBy { it.courseCode }

                if (headingText.contains("Total Units Required", ignoreCase = true) || headingText.contains("Summary of Degree Units", ignoreCase = true)) {
                    continue
                }

                if (courses.isEmpty() && !importedRequirementNames.any { headingText.contains(it, ignoreCase = true) }) {
                    continue
                }

                requirements.add(
                    ParsedCatalogRequirement(
                        categoryName = headingText.replace(Regex("""\s+"""), " ").trim(),
                        requiredUnits = units,
                        courses = courses
                    )
                )
            }
        }

        if (requirements.isEmpty()) {
            val roots = document.select("div.acalog-core, .program_requirement, .programdetails, .program-details, .requirement, section, .course-list")
            val sections = if (roots.isNotEmpty()) roots else document.select("h2, h3, h4")

            for (block in sections) {
                val heading = directHeading(block) ?: continue
                val headingTextRaw = normalizeText(heading.text())
                if (headingTextRaw.isBlank()) continue
                if (headingTextRaw.contains("Total Units Required", ignoreCase = true)
                    || headingTextRaw.contains("Summary of Degree Units", ignoreCase = true)) continue
                if (!importedRequirementNames.any { headingTextRaw.contains(it, ignoreCase = true) }) continue

                val candidateCourses = block.select("li, .acalog-course, .course, p, tr, .course__name")
                    .flatMap { extractCourseFromText(it) }
                    .distinctBy { it.courseCode }

                val requiredUnits = Regex("""\((\d+)\s+units?\)""", RegexOption.IGNORE_CASE)
                    .find(headingTextRaw)
                    ?.groupValues
                    ?.getOrNull(1)
                    ?.toIntOrNull()
                    ?: (if (candidateCourses.isNotEmpty()) candidateCourses.sumOf { it.units } else 0)

                requirements.add(
                    ParsedCatalogRequirement(
                        categoryName = headingTextRaw.replace(Regex("""\s+"""), " ").trim(),
                        requiredUnits = requiredUnits,
                        courses = candidateCourses
                    )
                )
            }
        }

        return requirements
    }

    private fun directHeading(element: Element): Element? {
        val directChildren = element.children()
        val heading = directChildren.firstOrNull { child ->
            child.tagName() in setOf("h2", "h3", "h4", "strong")
        }
        if (heading != null) return heading

        return if (element.tagName() in setOf("h2", "h3", "h4", "strong")) element else null
    }

    private fun extractCourseFromText(element: Element): List<ParsedCatalogCourse> {
        val candidates = mutableListOf<ParsedCatalogCourse>()

        val links = element.select("a[href*='preview_course.php'], a[onclick*=showCourse], a[onClick*=showCourse]")
        for (link in links) {
            val parsed = parseCourseElement(link)
            if (parsed != null) candidates.add(parsed)
        }

        if (candidates.isNotEmpty()) return candidates

        val text = normalizeText(element.text())
        val courseCode = parseCourseCode(text) ?: return emptyList()
        val title = text.substringAfter(" - ", courseCode).trim()
        val units = Regex("""\b(\d+)\b""").findAll(text).map { it.groupValues[1].toInt() }.firstOrNull() ?: 0

        return listOf(
            ParsedCatalogCourse(
                courseCode = courseCode,
                courseTitle = title.ifBlank { courseCode },
                units = units,
                department = courseCode.substringBefore(' '),
                catalogCourseId = null
            )
        )
    }

    private fun parseCourseElement(link: Element): ParsedCatalogCourse? {
        val label = normalizeText(link.text())
        val courseCode = parseCourseCode(label) ?: return null
        val title = label.substringAfter(" - ", courseCode).trim().ifBlank { courseCode }
        val parentText = normalizeText(link.parent()?.text() ?: "")
        val units = Regex("""\b(\d+)\b""")
            .findAll(parentText)
            .map { it.groupValues[1].toInt() }
            .firstOrNull() ?: 0

        val onclick = link.attr("onclick").ifBlank { link.attr("onClick") }
        val dataAcourse = link.attr("data-acalog-course").ifBlank { link.attr("data-acalog-course-id") }
        val catalogCourseIdFromOnclick = Regex("""showCourse\s*\(\s*'\d+'\s*,\s*'(\d+)'""")
            .find(onclick)
            ?.groupValues
            ?.getOrNull(1)
        val catalogCourseId = dataAcourse.ifBlank { catalogCourseIdFromOnclick }

        return ParsedCatalogCourse(
            courseCode = courseCode,
            courseTitle = title,
            units = units,
            department = courseCode.substringBefore(' '),
            catalogCourseId = catalogCourseId
        )
    }

    private fun parseCourseDiv(courseDiv: Element): ParsedCatalogCourse? {
        val dataId = courseDiv.attr("data-acalog-course").ifBlank { courseDiv.attr("data-acalog-course-id") }
        val catalogCourseId = dataId.ifBlank { null }

        val titleText = courseDiv.selectFirst(".course__name-text")?.text()?.trim() ?: courseDiv.text()
        val courseCode = parseCourseCode(titleText) ?: return null
        val courseTitle = titleText.substringAfter(" - ", courseCode).trim().ifBlank { courseCode }

        val unitsText = courseDiv.selectFirst(".course__hours .course__hours-content em, .course__hours-content em")?.text()?.trim()
        val units = unitsText?.toIntOrNull() ?: 0

        val department = courseCode.substringBefore(' ')
        return ParsedCatalogCourse(
            courseCode = courseCode,
            courseTitle = courseTitle,
            units = units,
            department = department,
            catalogCourseId = catalogCourseId
        )
    }

    private fun parsePrerequisites(originalSourceUrl: String, course: ParsedCatalogCourse): List<ParsedCatalogPrerequisite> {
        val catoid = Regex("""catalog=(\d+)""").find(originalSourceUrl)?.groupValues?.getOrNull(1)
            ?: Regex("""catoid=(\d+)""").find(originalSourceUrl)?.groupValues?.getOrNull(1)
            ?: Regex("""program=(\d+)""").find(originalSourceUrl)?.groupValues?.getOrNull(1)
            ?: return emptyList()

        val coid = course.catalogCourseId ?: return emptyList()

        try {
            val detail = Jsoup.connect(
                "https://catalog.sjsu.edu/ajax/preview_course.php?catoid=$catoid&coid=$coid&display_options%5Blocation%5D=tooltip&show"
            )
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .referrer("https://catalog.sjsu.edu/")
                .timeout(30_000)
                .execute()

            if (detail.statusCode() >= 400) {
                println("[CatalogProgramScraperService] Warning: prerequisite lookup failed for ${course.courseCode} (${course.catalogCourseId}) with HTTP ${detail.statusCode()}; ignoring prerequisites for this course.")
                return emptyList()
            }

            val html = detail.body()
            return parsePrerequisiteSection(html, "Prerequisite(s):", "prereq", course.courseCode) +
                parsePrerequisiteSection(html, "Corequisite(s):", "coreq", course.courseCode)
        } catch (ex: Exception) {
            println("[CatalogProgramScraperService] Warning: exception while looking up prerequisites for ${course.courseCode} (${course.catalogCourseId}): ${ex.message}; ignoring prerequisites for this course.")
            return emptyList()
        }
    }

    private fun parsePrerequisiteSection(html: String, label: String, type: String, courseCode: String): List<ParsedCatalogPrerequisite> {
        val labelIndex = html.indexOf(label)
        if (labelIndex < 0) return emptyList()

        val afterLabel = html.substring(labelIndex + label.length)
        val endIndex = listOf(
            afterLabel.indexOf("<br><strong>"),
            afterLabel.indexOf("<strong>Grading"),
            afterLabel.indexOf("<br><br><strong>"),
            afterLabel.indexOf("<br><em>"),
            afterLabel.indexOf("<p>")
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
        val normalized = text
            .replace('\u00a0', ' ')
            .replace(Regex("""\s+"""), " ")
            .trim()
        val match = Regex("""^([A-Z]{2,5})\s+([0-9]{1,3}[A-Z]?)""").find(normalized.uppercase()) ?: return null
        return "${match.groupValues[1]} ${match.groupValues[2]}"
    }

    private fun normalizeText(value: String): String {
        return value
            .replace('\u00a0', ' ')
            .replace(Regex("""\s+"""), " ")
            .trim()
    }
}
