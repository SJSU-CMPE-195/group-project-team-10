package edu.sjsu.courseplanner.backend

import com.fasterxml.jackson.databind.ObjectMapper
import edu.sjsu.courseplanner.backend.repository.CoursesTable
import edu.sjsu.courseplanner.backend.repository.DegreeRequirementsTable
import edu.sjsu.courseplanner.backend.repository.PrerequisitesTable
import edu.sjsu.courseplanner.backend.repository.RequirementCoursesTable
import edu.sjsu.courseplanner.backend.service.CatalogProgramScraperService
import edu.sjsu.courseplanner.backend.service.ParsedCatalogCourse
import edu.sjsu.courseplanner.backend.service.ParsedCatalogPrerequisite
import edu.sjsu.courseplanner.backend.service.ParsedCatalogProgram
import edu.sjsu.courseplanner.backend.service.ParsedCatalogRequirement
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest(
    properties = [
        "spring.datasource.url=jdbc:h2:mem:catalog-electives-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "planner.exposed.schema-init.enabled=true"
    ]
)
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class CatalogProgramTechnicalElectivesImportTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    private val objectMapper = ObjectMapper()

    @Autowired
    private lateinit var database: org.jetbrains.exposed.v1.jdbc.Database

    @MockitoBean
    private lateinit var catalogProgramScraperService: CatalogProgramScraperService

    @Test
    fun `elective endpoint imports each major idempotently and major import leaves electives untouched`() {
        seedExistingElectiveCourse()
        Mockito.`when`(catalogProgramScraperService.scrapeProgram("cmpe"))
            .thenReturn(parsedProgram("cmpe", "Computer Engineering, BS"))
        Mockito.`when`(catalogProgramScraperService.scrapeProgram("swe"))
            .thenReturn(parsedProgram("swe", "Software Engineering, BS"))

        val cmpeMajorId = importMajor("cmpe")
        assertEquals(
            0,
            transaction(database) {
                CoursesTable.selectAll().where { CoursesTable.courseCode eq "CS 116A" }.count()
            },
            "The major requirements endpoint must not import technical elective rows"
        )
        val existingElectiveId = transaction(database) {
            CoursesTable.selectAll()
                .where { CoursesTable.courseCode eq "CMPE 137" }
                .single()[CoursesTable.id]
        }

        transaction(database) {
            DegreeRequirementsTable.insert { row ->
                row[majorId] = cmpeMajorId
                row[categoryName] = "Existing Additional Category"
                row[requiredUnits] = 3
            }
        }

        val sweMajorId = importMajor("swe")
        seedLegacySwePreparationRequirements(sweMajorId)
        importTechnicalElectives("cmpe")
        importTechnicalElectives("swe")
        importTechnicalElectives("cmpe")
        importTechnicalElectives("swe")
        importMajor("cmpe")
        importMajor("swe")

        assertEquals(
            1,
            transaction(database) {
                CoursesTable.selectAll().where { CoursesTable.courseCode eq "CMPE 137" }.count()
            },
            "An existing elective course row must be reused"
        )
        assertEquals(
            "Pre-existing elective title",
            transaction(database) {
                CoursesTable.selectAll()
                    .where { CoursesTable.id eq existingElectiveId }
                    .single()[CoursesTable.courseTitle]
            }
        )
        assertEquals(
            1,
            transaction(database) {
                PrerequisitesTable.selectAll()
                    .where { PrerequisitesTable.courseId eq existingElectiveId }
                    .count()
            },
            "Importing a major must not erase elective prerequisite/corequisite rows"
        )
        val coreCourseId = transaction(database) {
            CoursesTable.selectAll()
                .where { CoursesTable.courseCode eq "CMPE 131" }
                .single()[CoursesTable.id]
        }
        assertEquals(
            setOf("prereq", "coreq"),
            transaction(database) {
                PrerequisitesTable.selectAll()
                    .where { PrerequisitesTable.courseId eq coreCourseId }
                    .map { it[PrerequisitesTable.prereqType] }
                    .toSet()
            },
            "Repeated imports must continue rebuilding both prerequisite and corequisite edges"
        )

        val cmpeRoadmap = getRoadmap(cmpeMajorId)
        val sweRoadmap = getRoadmap(sweMajorId)
        assertTechnicalElectives(cmpeRoadmap, "CMPE 180-02", 26)
        assertTechnicalElectives(sweRoadmap, "CS 116A", 20)
        assertEquals(
            1,
            sweRoadmap["degreeRequirements"].count {
                it["categoryName"].asText() == "Major Preparation"
            },
            "SWE should expose a single Major Preparation requirement"
        )
        assertTrue(
            sweRoadmap["degreeRequirements"].none {
                it["categoryName"].asText().startsWith("Complete One Course From") ||
                    it["categoryName"].asText().startsWith("Complete Additional Math/Science Electives")
            },
            "Legacy child requirement rows should be removed after the grouped import"
        )
        val majorPreparationId = sweRoadmap["degreeRequirements"].first {
            it["categoryName"].asText() == "Major Preparation"
        }["requirementId"].asInt()
        val math30Id = sweRoadmap["courses"].first {
            it["courseCode"].asText() == "MATH 30"
        }["courseId"].asInt()
        assertTrue(
            sweRoadmap["degreeRequirements"].first {
                it["requirementId"].asInt() == majorPreparationId
            }["courseIds"].any { it.asInt() == math30Id },
            "Major Preparation should retain its course associations"
        )
        assertTrue(cmpeRoadmap["courses"].any { it["courseCode"].asText() == "CMPE 188" })
        assertEquals(
            1,
            transaction(database) {
                CoursesTable.selectAll().where { CoursesTable.courseCode eq "CS 116A" }.count()
            },
            "Repeated imports must reuse the catalog course row"
        )
        val cmpeTechnicalRequirementId = cmpeRoadmap["degreeRequirements"].first {
            it["categoryName"].asText() == "Approved Upper Division Electives"
        }["requirementId"].asInt()
        assertEquals(
            26,
            transaction(database) {
                RequirementCoursesTable.selectAll()
                    .where { RequirementCoursesTable.requirementId eq cmpeTechnicalRequirementId }
                    .count()
            }
        )
        assertTrue(
            cmpeRoadmap["degreeRequirements"].any {
                it["categoryName"].asText() == "Existing Additional Category"
            },
            "Other requirement categories must be preserved"
        )
    }

    private fun seedExistingElectiveCourse() {
        transaction(database) {
            val electiveId = CoursesTable.insert { row ->
                row[courseCode] = "CMPE 137"
                row[courseTitle] = "Pre-existing elective title"
                row[description] = null
                row[units] = 4
                row[department] = "CMPE"
                row[difficultyScore] = null
                row[avgWorkload] = null
                row[syllabusUrl] = null
            } get CoursesTable.id
            val prerequisiteId = CoursesTable.insert { row ->
                row[courseCode] = "CMPE 30"
                row[courseTitle] = "Existing prerequisite"
                row[description] = null
                row[units] = 3
                row[department] = "CMPE"
                row[difficultyScore] = null
                row[avgWorkload] = null
                row[syllabusUrl] = null
            } get CoursesTable.id
            PrerequisitesTable.insert { row ->
                row[courseId] = electiveId
                row[prereqCourseId] = prerequisiteId
                row[prereqType] = "prereq"
            }
        }
    }

    private fun seedLegacySwePreparationRequirements(majorId: Int) {
        transaction(database) {
            listOf(
                "Complete One Course From:",
                "Complete Additional Math/Science Electives (7 units)"
            ).forEach { category ->
                DegreeRequirementsTable.insert { row ->
                    row[DegreeRequirementsTable.majorId] = majorId
                    row[DegreeRequirementsTable.categoryName] = category
                    row[DegreeRequirementsTable.requiredUnits] = 0
                }
            }
        }
    }

    private fun importMajor(program: String): Int {
        val response = mockMvc.perform(
            post("/api/catalog-programs/import")
                .param("program", program)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andReturn()
            .response
        return objectMapper.readTree(response.contentAsString)["majorId"].asInt()
    }

    private fun importTechnicalElectives(program: String) {
        mockMvc.perform(
            post("/api/catalog-programs/import-technical-electives")
                .param("program", program)
                .contentType(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
    }

    private fun getRoadmap(majorId: Int) = objectMapper.readTree(
        mockMvc.perform(get("/api/roadmaps/majors/$majorId"))
            .andExpect(status().isOk)
            .andReturn()
            .response.contentAsString
    )

    private fun assertTechnicalElectives(
        roadmap: com.fasterxml.jackson.databind.JsonNode,
        expectedCourseCode: String,
        expectedElectiveCount: Int
    ) {
        val category = roadmap["degreeRequirements"].firstOrNull {
            it["categoryName"].asText() == "Approved Upper Division Electives"
        }
        assertTrue(category != null, "Approved Upper Division Electives should be exposed by the roadmap API")
        assertEquals(6, category!!["requiredUnits"].asInt())
        val technicalElectiveCourseIds = category["courseIds"].map { it.asInt() }.toSet()
        val technicalElectiveRequirementId = category["requirementId"].asInt()
        val course = roadmap["courses"].firstOrNull {
            it["courseCode"].asText() == expectedCourseCode
        }
        assertTrue(course != null, "$expectedCourseCode should be exposed by the roadmap API")
        assertTrue(
            course!!["requirementIds"].any { it.asInt() == technicalElectiveRequirementId },
            "$expectedCourseCode should be linked to Approved Upper Division Electives"
        )
        assertEquals(expectedElectiveCount, technicalElectiveCourseIds.size)
    }

    private fun parsedProgram(programKey: String, majorName: String) = ParsedCatalogProgram(
        programKey = programKey,
        sourceUrl = "https://catalog.sjsu.edu/test/$programKey",
        majorName = majorName,
        department = if (programKey == "cmpe") "Computer Engineering" else "Software Engineering",
        totalUnits = 120,
        requirements = listOf(
            ParsedCatalogRequirement(
                categoryName = "Core Courses",
                requiredUnits = 3,
                courses = listOf(
                    ParsedCatalogCourse("CMPE 131", "Software Engineering I", 3, "CMPE", "131")
                )
            ),
            ParsedCatalogRequirement(
                categoryName = "Approved Upper Division Electives (6 units)",
                requiredUnits = 6,
                courses = emptyList()
            )
        ) + if (programKey == "swe") {
            listOf(
                ParsedCatalogRequirement(
                    categoryName = "Major Preparation",
                    requiredUnits = 33,
                    courses = listOf(
                        ParsedCatalogCourse("MATH 30", "Calculus I", 3, "MATH", "20986")
                    )
                )
            )
        } else emptyList(),
        prerequisites = listOf(
            ParsedCatalogPrerequisite("CMPE 131", "CMPE 30", "prereq"),
            ParsedCatalogPrerequisite("CMPE 131", "CMPE 30", "coreq")
        )
    )
}
