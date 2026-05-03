package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.dto.ScrapeDebugResult
import edu.sjsu.courseplanner.backend.dto.ScrapedSectionDto
import edu.sjsu.courseplanner.backend.repository.ScheduleImportResult
import edu.sjsu.courseplanner.backend.service.ScheduleImportService
import edu.sjsu.courseplanner.backend.service.ScheduleScraperService
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class ScrapeControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockitoBean
    private lateinit var scheduleScraperService: ScheduleScraperService

    @MockitoBean
    private lateinit var scheduleImportService: ScheduleImportService

    @Test
    fun `import endpoint returns normalized import counts for requested term`() {
        val scrapedRows = listOf(
            ScrapedSectionDto(
                courseCode = "CMPE 195A",
                sectionCode = "01",
                classNumber = "12345",
                modeOfInstruction = "In Person",
                title = "Senior Project I",
                satisfies = null,
                units = 3.0,
                type = "Lecture",
                days = "MW",
                times = "09:00-10:15",
                instructor = "Ada Lovelace",
                location = "ENG 101",
                dates = "01/20-05/20",
                openSeats = 10
            )
        )

        given(scheduleScraperService.scrapeSectionsDebug("Spring 2026", Int.MAX_VALUE))
            .willReturn(
                ScrapeDebugResult(
                    totalRowsSeen = 1,
                    parsedCount = 1,
                    skippedCount = 0,
                    parsed = scrapedRows,
                    skippedRows = emptyList()
                )
            )

        given(scheduleImportService.importScrapedTerm("Spring 2026", scrapedRows))
            .willReturn(
                ScheduleImportResult(
                    term = "Spring 2026",
                    coursesCreated = 1,
                    instructorsCreated = 1,
                    offeringsSaved = 1,
                    sectionsSaved = 1
                )
            )

        mockMvc.perform(get("/api/scrape/import").param("term", "Spring 2026"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.term").value("Spring 2026"))
            .andExpect(jsonPath("$.scrapedCount").value(1))
            .andExpect(jsonPath("$.coursesCreated").value(1))
            .andExpect(jsonPath("$.instructorsCreated").value(1))
            .andExpect(jsonPath("$.offeringsSaved").value(1))
            .andExpect(jsonPath("$.sectionsSaved").value(1))
    }
}
