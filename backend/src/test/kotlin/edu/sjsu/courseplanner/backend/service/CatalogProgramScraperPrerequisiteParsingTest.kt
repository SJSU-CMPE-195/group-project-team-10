package edu.sjsu.courseplanner.backend.service

import org.jsoup.Jsoup
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.File

class CatalogProgramScraperPrerequisiteParsingTest {
    private val scraper = CatalogProgramScraperService()

    @Test
    fun `reads prerequisite links inside paragraph blocks`() {
        val html = """
            <strong>Prerequisite(s):</strong>
            <p><a href="/course/math-30">MATH 30 - Calculus I</a> with a grade of C- or better</p>
            <br />
            <strong>Corequisite(s):</strong>
            <p><a href="/course/math-31w">MATH 31W - Workshop</a></p>
            <strong>Grading:</strong>
        """.trimIndent()

        val prerequisites = scraper.parsePrerequisiteSection(html, "Prerequisite(s):", "prereq", "MATH 31")
        val corequisites = scraper.parsePrerequisiteSection(html, "Corequisite(s):", "coreq", "MATH 31")

        assertEquals(listOf("MATH 30"), prerequisites.map { it.prereqCourseCode })
        assertEquals(listOf("MATH 31W"), corequisites.map { it.prereqCourseCode })
    }

    @Test
    fun `groups SWE major preparation child groups under one requirement`() {
        val source = listOf(
            File("../data/major_requirements/SWE_BS.html"),
            File("data/major_requirements/SWE_BS.html")
        ).first { it.exists() }

        val requirements = scraper.parseRequirements(Jsoup.parse(source, "UTF-8"))
        val preparation = requirements.filter {
            it.categoryName.equals("Major Preparation", ignoreCase = true)
        }

        assertEquals(1, preparation.size)
        assertEquals(33, preparation.single().requiredUnits)
        val courseCodes = preparation.single().courses.map { it.courseCode }
        assertTrue(
            courseCodes.containsAll(listOf("MATH 30", "MATH 31", "MATH 33LA", "ISE 130", "PHYS 50")),
            "Parsed Major Preparation courses: $courseCodes"
        )
        assertTrue(
            requirements.none {
                it.categoryName.startsWith("Complete One Course From", ignoreCase = true) ||
                    it.categoryName.startsWith("Complete Additional Math/Science Electives", ignoreCase = true)
            }
        )
    }
}
