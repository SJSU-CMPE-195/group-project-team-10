package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.dto.SectionDto
import edu.sjsu.courseplanner.backend.repository.ScheduleDataRepository
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
class ScheduleDataAccessControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var scheduleDataRepository: ScheduleDataRepository

    // Seeds test schedule data so each endpoint can be verified against known rows.
    @BeforeEach
    fun setUp() {
        scheduleDataRepository.deleteAll()
        scheduleDataRepository.saveAll(
            listOf(
                SectionDto(
                    term = "Spring 2026",
                    courseCode = "CMPE 195A",
                    sectionCode = "01",
                    classNumber = "12345",
                    modeOfInstruction = "In Person",
                    title = "Senior Project",
                    units = 3.0,
                    type = "Lecture",
                    days = "MW",
                    times = "09:00-10:15",
                    instructor = "Ada Lovelace",
                    location = "ENG 101",
                    dates = "01/20-05/20",
                    openSeats = 12
                ),
                SectionDto(
                    term = "Spring 2026",
                    courseCode = "CMPE 195A",
                    sectionCode = "02",
                    classNumber = "12346",
                    modeOfInstruction = "In Person",
                    title = "Senior Project",
                    units = 3.0,
                    type = "Lecture",
                    days = "TTH",
                    times = "13:30-14:45",
                    instructor = "Grace Hopper",
                    location = "ENG 102",
                    dates = "01/20-05/20",
                    openSeats = 0
                ),
                SectionDto(
                    term = "Spring 2026",
                    courseCode = "MATH 42",
                    sectionCode = "03",
                    classNumber = "54321",
                    modeOfInstruction = "Online",
                    title = "Discrete Math",
                    units = 3.0,
                    type = "Lecture",
                    days = "MW",
                    times = "15:00-16:15",
                    instructor = "Katherine Johnson",
                    location = "Online",
                    dates = "01/20-05/20",
                    openSeats = 5
                )
            )
        )
    }

    // Confirms the full-schedule endpoint returns schema-aligned course offering fields.
    @Test
    fun `full schedule endpoint returns shaped schedule rows`() {
        mockMvc.perform(get("/api/schedule-data/full-schedule").param("term", "Spring 2026"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].department").value("CMPE"))
            .andExpect(jsonPath("$[0].courseNumber").value("195A"))
            .andExpect(jsonPath("$[0].courseCode").value("CMPE 195A"))
            .andExpect(jsonPath("$[0].courseTitle").value("Senior Project"))
    }

    // Confirms the department endpoint groups multiple offerings into one course-level summary.
    @Test
    fun `department endpoint returns grouped course summaries`() {
        mockMvc.perform(get("/api/schedule-data/departments/CMPE/courses").param("term", "Spring 2026"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].department").value("CMPE"))
            .andExpect(jsonPath("$[0].courseCode").value("CMPE 195A"))
            .andExpect(jsonPath("$[0].courseTitle").value("Senior Project"))
            .andExpect(jsonPath("$[0].totalSections").value(2))
            .andExpect(jsonPath("$[0].openSections").value(1))
    }
}
