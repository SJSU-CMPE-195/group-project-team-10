package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.model.SectionEntity
import edu.sjsu.courseplanner.backend.repository.ScheduleDataRepository
import edu.sjsu.courseplanner.backend.repository.SectionRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class DatabaseIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var scheduleDataRepository: ScheduleDataRepository

    @Autowired
    private lateinit var sectionRepository: SectionRepository

    @BeforeEach
    fun clearDatabase() {
        scheduleDataRepository.deleteAll()
    }

    @Test
    fun `db endpoint reports connected`() {
        mockMvc.perform(get("/api/db"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.database").value("connected"))
    }

    @Test
    fun `repositories can save query replace and delete section rows`() {
        val springCmpe = section(
            term = "Spring 2026",
            courseCode = "CMPE 195A",
            sectionCode = "01",
            classNumber = "12345",
            openSeats = 12
        )
        val springMath = section(
            term = "Spring 2026",
            courseCode = "MATH 42",
            sectionCode = "03",
            classNumber = "54321",
            openSeats = 5
        )

        scheduleDataRepository.saveAll(listOf(springCmpe, springMath))

        val allSections = sectionRepository.findAll()
        val springSections = sectionRepository.findByTerm("Spring 2026")
        val cmpeSections = scheduleDataRepository.findByDepartment("CMPE", "Spring 2026")

        assertEquals(2, allSections.size)
        assertEquals(2, springSections.size)
        assertEquals(1, cmpeSections.size)
        assertEquals("CMPE 195A", cmpeSections.single().courseCode)

        val fallReplacement = listOf(
            section(
                term = "Fall 2026",
                courseCode = "CMPE 131",
                sectionCode = "02",
                classNumber = "77777",
                openSeats = 30
            )
        )

        val replacedCount = sectionRepository.replaceSectionsForTerm("Fall 2026", fallReplacement)
        assertEquals(1, replacedCount)
        assertEquals(1, sectionRepository.findByTerm("Fall 2026").size)

        val deletedCount = scheduleDataRepository.deleteScheduleForTerm("Spring 2026")
        assertEquals(2, deletedCount)
        assertTrue(sectionRepository.findByTerm("Spring 2026").isEmpty())
    }

    private fun section(
        term: String,
        courseCode: String,
        sectionCode: String,
        classNumber: String,
        openSeats: Int
    ) = SectionEntity(
        term = term,
        courseCode = courseCode,
        sectionCode = sectionCode,
        classNumber = classNumber,
        modeOfInstruction = "In Person",
        title = "Test Course",
        satisfies = null,
        units = 3.0,
        type = "Lecture",
        days = "MW",
        times = "09:00-10:15",
        instructor = "Test Instructor",
        location = "ENG 101",
        dates = "01/20-05/20",
        openSeats = openSeats,
        notes = null
    )
}
