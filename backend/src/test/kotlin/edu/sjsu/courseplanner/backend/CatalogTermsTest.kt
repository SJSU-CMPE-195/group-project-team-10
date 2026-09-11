package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.repository.CatalogRepository
import edu.sjsu.courseplanner.backend.repository.ScheduleDataRepository
import edu.sjsu.courseplanner.backend.service.ScheduleImportService
import javax.sql.DataSource
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class CatalogTermsTest {

    @Autowired
    private lateinit var catalogRepository: CatalogRepository

    @Autowired
    private lateinit var scheduleImportService: ScheduleImportService

    @Autowired
    private lateinit var scheduleDataRepository: ScheduleDataRepository

    @Autowired
    private lateinit var dataSource: DataSource

    @BeforeEach
    fun clearDatabase() {
        scheduleDataRepository.deleteAll()
        dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.executeUpdate("DELETE FROM course_offerings")
                statement.executeUpdate("DELETE FROM instructors")
                statement.executeUpdate("DELETE FROM courses")
            }
        }
    }

    @Test
    fun `terms that have already ended are not offered`() {
        scheduleImportService.importScrapedTerm(
            "Spring 2020",
            listOf(scraped("CMPE 120", "01/22/20-05/11/20"))
        )
        scheduleImportService.importScrapedTerm(
            "Fall 2090",
            listOf(scraped("CMPE 131", "08/19/90-12/07/90"))
        )

        val terms = catalogRepository.findAvailableTerms()

        assertFalse(terms.contains("Spring 2020"), "an ended term should be hidden")
        assertTrue(terms.contains("Fall 2090"), "a future term should be offered")
    }

    @Test
    fun `a term stays visible while any of its sections is still running`() {
        // most rows ended long ago, one runs well into the future
        scheduleImportService.importScrapedTerm(
            "Spring 2090",
            listOf(
                scraped("CMPE 120", "01/22/20-05/11/20"),
                scraped("CMPE 131", "01/22/90-05/11/90")
            )
        )

        assertTrue(catalogRepository.findAvailableTerms().contains("Spring 2090"))
    }

    @Test
    fun `terms are ordered the way sjsu runs them, winter before spring`() {
        scheduleImportService.importScrapedTerm(
            "Spring 2091",
            listOf(scraped("CMPE 120", "01/26/91-05/15/91"))
        )
        scheduleImportService.importScrapedTerm(
            "Fall 2090",
            listOf(scraped("CMPE 131", "08/19/90-12/07/90"))
        )
        scheduleImportService.importScrapedTerm(
            "Winter 2091",
            listOf(scraped("CMPE 133", "01/04/91-01/22/91"))
        )

        assertEquals(
            listOf("Fall 2090", "Winter 2091", "Spring 2091"),
            catalogRepository.findAvailableTerms()
        )
    }

    private var nextClassNumber = 10000

    private fun scraped(courseCode: String, dates: String) = ScrapedSectionDto(
        courseCode = courseCode,
        sectionCode = "01",
        classNumber = (nextClassNumber++).toString(),
        modeOfInstruction = "In Person",
        title = "Test Course",
        satisfies = null,
        units = 3.0,
        type = "LEC",
        days = "MW",
        times = "09:00AM-10:15AM",
        instructor = "Test Instructor",
        location = "ENG 101",
        dates = dates,
        openSeats = 10
    )
}
