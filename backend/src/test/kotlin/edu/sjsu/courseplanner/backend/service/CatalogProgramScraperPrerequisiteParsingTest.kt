package edu.sjsu.courseplanner.backend.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

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
}
