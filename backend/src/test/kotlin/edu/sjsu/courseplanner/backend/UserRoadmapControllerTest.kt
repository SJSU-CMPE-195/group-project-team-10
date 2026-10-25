package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.dto.UserDto
import edu.sjsu.courseplanner.backend.repository.CoursesTable
import edu.sjsu.courseplanner.backend.repository.DegreeRequirementsTable
import edu.sjsu.courseplanner.backend.repository.MajorsTable
import edu.sjsu.courseplanner.backend.repository.PrerequisitesTable
import edu.sjsu.courseplanner.backend.repository.PrerequisiteCsvConditionsTable
import edu.sjsu.courseplanner.backend.repository.RequirementCoursesTable
import edu.sjsu.courseplanner.backend.repository.UserRepository
import edu.sjsu.courseplanner.backend.repository.UserRoadmapsTable
import edu.sjsu.courseplanner.backend.repository.UsersTable
import java.util.UUID
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteAll
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest(
    properties = [
        "spring.datasource.url=jdbc:h2:mem:user-roadmap-controller-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "planner.exposed.schema-init.enabled=true"
    ]
)
@AutoConfigureMockMvc
class UserRoadmapControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var database: Database

    @Test
    fun `account roadmap requires authentication and is isolated to the current user`() {
        val fixture = seedFixture()
        val roadmapBody = roadmapBody(fixture.majorId, fixture.courseId)

        mockMvc.perform(get("/api/roadmaps/me"))
            .andExpect(status().isUnauthorized)

        mockMvc.perform(
            put("/api/roadmaps/me")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapBody)
        ).andExpect(status().isUnauthorized)

        mockMvc.perform(
            put("/api/roadmaps/me")
                .with(user(fixture.firstEmail))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapBody)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.majorId").value(fixture.majorId))
            .andExpect(jsonPath("$.semesters[0].courses[0].courseId").value(fixture.courseId))

        mockMvc.perform(get("/api/roadmaps/me").with(user(fixture.firstEmail)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.majorId").value(fixture.majorId))
            .andExpect(jsonPath("$.courses[0].courseCode").isString)

        mockMvc.perform(get("/api/roadmaps/me").with(user(fixture.secondEmail)))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `public default roadmap returns persisted prerequisite edges and requirement notes`() {
        val fixture = seedFixture()

        mockMvc.perform(get("/api/roadmaps/majors/${fixture.majorId}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.major.majorName").value("Computer Engineering, BS"))
            .andExpect(jsonPath("$.major.catalogProgramKey").value("cmpe"))
            .andExpect(jsonPath("$.major.catalogYear").value(23))
            .andExpect(jsonPath("$.degreeRequirements[0].notes").value("Minimum grade C or better"))
            .andExpect(jsonPath("$.degreeRequirements[0].sourceUrl").value("https://catalog.sjsu.edu/preview_program.php?catoid=23&poid=18780"))
            .andExpect(jsonPath("$.prerequisites[0].courseId").value(fixture.courseId))
            .andExpect(jsonPath("$.prerequisites[0].prereqCourseId").value(fixture.prerequisiteId))
            .andExpect(jsonPath("$.prerequisiteConditions[0].originalText").value("TST prerequisite expression retained"))
            .andExpect(jsonPath("$.prerequisiteConditions[0].sourceUrl").value("https://catalog.sjsu.edu/preview_course.php?catoid=23&coid=1"))
    }

    @Test
    fun `account roadmap rejects unknown course IDs and missing majors`() {
        val fixture = seedFixture()

        mockMvc.perform(
            put("/api/roadmaps/me")
                .with(user(fixture.firstEmail))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapBody(fixture.majorId, Int.MAX_VALUE))
        ).andExpect(status().isBadRequest)

        mockMvc.perform(
            put("/api/roadmaps/me")
                .with(user(fixture.firstEmail))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(roadmapBody(Int.MAX_VALUE, fixture.courseId))
        ).andExpect(status().isNotFound)
    }

    private fun seedFixture(): Fixture {
        val suffix = UUID.randomUUID().toString().replace("-", "").take(12)
        val firstEmail = "roadmap-first-$suffix@test.edu"
        val secondEmail = "roadmap-second-$suffix@test.edu"
        userRepository.save(UserDto(email = firstEmail, fullName = "First User", provider = "google"))
        userRepository.save(UserDto(email = secondEmail, fullName = "Second User", provider = "google"))

        return transaction(database) {
            val majorId = MajorsTable.insert { statement ->
                statement[majorName] = "Computer Engineering, BS"
                statement[department] = "CMPE"
                statement[totalUnits] = 120
                statement[catalogProgramKey] = "cmpe"
                statement[catalogSourceUrl] = "https://catalog.sjsu.edu/preview_program.php?catoid=23&poid=18780"
                statement[catalogYear] = 23
            } get MajorsTable.id
            val requirementId = DegreeRequirementsTable.insert { statement ->
                statement[DegreeRequirementsTable.majorId] = majorId
                statement[categoryName] = "Major Core"
                statement[requiredUnits] = 3
                statement[notes] = "Minimum grade C or better"
                statement[sourceUrl] = "https://catalog.sjsu.edu/preview_program.php?catoid=23&poid=18780"
            } get DegreeRequirementsTable.id
            val courseId = insertCourse("TST $suffix", "Test course")
            val prerequisiteId = insertCourse("TST ${suffix}A", "Test prerequisite")
            RequirementCoursesTable.insert { statement ->
                statement[RequirementCoursesTable.requirementId] = requirementId
                statement[RequirementCoursesTable.courseId] = courseId
            }
            PrerequisitesTable.insert { statement ->
                statement[PrerequisitesTable.courseId] = courseId
                statement[PrerequisitesTable.prereqCourseId] = prerequisiteId
                statement[PrerequisitesTable.prereqType] = "prereq"
            }
            PrerequisiteCsvConditionsTable.insert { statement ->
                statement[PrerequisiteCsvConditionsTable.courseId] = courseId
                statement[PrerequisiteCsvConditionsTable.relationshipType] = "prereq"
                statement[PrerequisiteCsvConditionsTable.sourceKey] = "catalog-program:cmpe"
                statement[PrerequisiteCsvConditionsTable.originalText] = "TST prerequisite expression retained"
                statement[PrerequisiteCsvConditionsTable.expressionJson] = null
                statement[PrerequisiteCsvConditionsTable.officialCourseUrl] =
                    "https://catalog.sjsu.edu/preview_course.php?catoid=23&coid=1"
            }
            Fixture(majorId, courseId, prerequisiteId, firstEmail, secondEmail)
        }
    }

    private fun insertCourse(code: String, title: String): Int =
        CoursesTable.insert { statement ->
            statement[courseCode] = code
            statement[courseTitle] = title
            statement[units] = 3
            statement[department] = "TST"
        } get CoursesTable.id

    private fun roadmapBody(majorId: Int, courseId: Int) =
        """{"majorId":$majorId,"semesters":[{"semesterId":1,"term":"Fall 2026","courses":[{"courseId":$courseId,"status":"planned","note":""}]}]}"""

    private data class Fixture(
        val majorId: Int,
        val courseId: Int,
        val prerequisiteId: Int,
        val firstEmail: String,
        val secondEmail: String
    )
}
