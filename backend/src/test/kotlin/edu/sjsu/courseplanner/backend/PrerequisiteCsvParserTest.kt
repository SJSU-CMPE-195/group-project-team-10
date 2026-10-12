package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.service.PrerequisiteCsvParser
import java.nio.charset.Charset
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class PrerequisiteCsvParserTest {
    private val parser = PrerequisiteCsvParser()

    @Test
    fun `parses quoted commas and both supported URL headers`() {
        val cmpe = """
            course_code,course_title,prerequisites,corequisites,official_course_url
            "CS-146","Data Structures, Algorithms","CS 46B and instructor consent",,"https://catalog.sjsu.edu/course/1"
        """.trimIndent().toByteArray()
        val swe = """
            course_code,course_title,prerequisites,corequisites,course_catalog_url
            "SWE 134","Software, Testing","SWE 132",,"https://catalog.sjsu.edu/course/2"
        """.trimIndent().toByteArray()

        val parsedCmpe = parser.parse("cmpe_prereq.csv", cmpe)
        val parsedSwe = parser.parse("swe_prereq.csv", swe)

        assertEquals(1, parsedCmpe.rows.size)
        assertEquals("Data Structures, Algorithms", parsedCmpe.rows.single().courseTitle)
        assertEquals("https://catalog.sjsu.edu/course/1", parsedCmpe.rows.single().officialCourseUrl)
        assertEquals("https://catalog.sjsu.edu/course/2", parsedSwe.rows.single().officialCourseUrl)
        assertTrue(parsedCmpe.invalidRows.isEmpty())
    }

    @Test
    fun `falls back to Windows 1252 and keeps empty relationship fields`() {
        val content = """
            course_code,course_title,prerequisites,corequisites,course_catalog_url
            SWE 134,Café Software,,,"https://catalog.sjsu.edu/course/2"
        """.trimIndent()

        val parsed = parser.parse("swe_prereq.csv", content.toByteArray(Charset.forName("windows-1252")))
        val row = parsed.rows.single()

        assertEquals("Café Software", row.courseTitle)
        assertEquals("", row.prerequisites)
        assertEquals("", row.corequisites)
    }

    @Test
    fun `rejects missing required headers before any import`() {
        val content = "course_code,course_title\nCS 146,Data Structures\n".toByteArray()

        val error = org.junit.jupiter.api.assertThrows<IllegalArgumentException> {
            parser.parse("bad.csv", content)
        }

        assertTrue(error.message.orEmpty().contains("prerequisites"))
    }
}
