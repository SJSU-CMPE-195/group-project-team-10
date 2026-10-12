package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.repository.CoursesTable
import edu.sjsu.courseplanner.backend.repository.DegreeRequirementsTable
import edu.sjsu.courseplanner.backend.repository.MajorsTable
import edu.sjsu.courseplanner.backend.repository.PrerequisiteCsvConditionsTable
import edu.sjsu.courseplanner.backend.repository.PrerequisiteCsvEdgesTable
import edu.sjsu.courseplanner.backend.repository.PrerequisiteCsvImportRepository
import edu.sjsu.courseplanner.backend.repository.PrerequisitesTable
import edu.sjsu.courseplanner.backend.repository.RequirementCoursesTable
import edu.sjsu.courseplanner.backend.repository.RoadmapRepository
import edu.sjsu.courseplanner.backend.service.ParsedPrerequisiteCsv
import edu.sjsu.courseplanner.backend.service.PrerequisiteCsvRow
import edu.sjsu.courseplanner.backend.service.RoadmapService
import javax.sql.DataSource
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.or
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class PrerequisiteCsvImportIntegrationTest {
    @Autowired
    private lateinit var database: Database

    @Autowired
    private lateinit var dataSource: DataSource

    @Autowired
    private lateinit var repository: PrerequisiteCsvImportRepository

    @AfterEach
    fun cleanTestRows() {
        transaction(database) {
            val testMajorIds = MajorsTable.selectAll()
                .where { MajorsTable.majorName eq "TST importer integration" }
                .map { it[MajorsTable.id] }
            if (testMajorIds.isNotEmpty()) {
                val requirementIds = DegreeRequirementsTable.selectAll()
                    .where { DegreeRequirementsTable.majorId inList testMajorIds }
                    .map { it[DegreeRequirementsTable.id] }
                if (requirementIds.isNotEmpty()) {
                    RequirementCoursesTable.deleteWhere {
                        RequirementCoursesTable.requirementId inList requirementIds
                    }
                    DegreeRequirementsTable.deleteWhere {
                        DegreeRequirementsTable.id inList requirementIds
                    }
                }
                MajorsTable.deleteWhere { MajorsTable.id inList testMajorIds }
            }
            val ids = CoursesTable.selectAll()
                .where { CoursesTable.courseCode inList listOf("TST 996", "TST 997", "TST 998", "TST 999") }
                .map { it[CoursesTable.id] }
            if (ids.isNotEmpty()) {
                PrerequisiteCsvEdgesTable.deleteWhere {
                    (PrerequisiteCsvEdgesTable.courseId inList ids) or
                        (PrerequisiteCsvEdgesTable.prereqCourseId inList ids)
                }
                PrerequisiteCsvConditionsTable.deleteWhere {
                    PrerequisiteCsvConditionsTable.courseId inList ids
                }
                PrerequisitesTable.deleteWhere {
                    (PrerequisitesTable.courseId inList ids) or
                        (PrerequisitesTable.prereqCourseId inList ids)
                }
            }
        }
        dataSource.connection.use { connection ->
            connection.createStatement().use {
                it.executeUpdate("DELETE FROM courses WHERE course_code LIKE 'TST %'")
            }
        }
    }

    @Test
    fun `imports shared courses by database ID and preserves alternatives and source ownership`() {
        val prerequisiteId = insertCourse("TST 998", "Existing prerequisite")
        val alternativeId = insertCourse("TST 997", "Alternative prerequisite")
        val cmpe = ParsedPrerequisiteCsv(
            "cmpe_prereq.csv",
            listOf(
                row(
                    "TST-999",
                    "Shared course",
                    "Prerequisite(s): TST 998 and TST 997 (both with grades of C- or better). Allowed Declared Majors: TST or SWE.",
                    ""
                )
            ),
            emptyList()
        )
        val swe = ParsedPrerequisiteCsv(
            "swe_prereq.csv",
            listOf(
                row("TST 999", "Shared course", "", "TST 998"),
                row("TST 996", "Course with alternatives", "TST 998 or TST 997", "")
            ),
            emptyList()
        )

        val firstImport = repository.importFiles(listOf(cmpe, swe))
        val targetId = courseId("TST 999")
        val secondImport = repository.importFiles(listOf(cmpe, swe))

        val targetEdges = transaction(database) {
            PrerequisitesTable.selectAll()
                .where { PrerequisitesTable.courseId eq targetId }
                .map { it[PrerequisitesTable.prereqCourseId] to it[PrerequisitesTable.prereqType] }
        }
        val alternativeCourseId = courseId("TST 996")
        val alternativeEdges = transaction(database) {
            PrerequisitesTable.selectAll()
                .where { PrerequisitesTable.courseId eq alternativeCourseId }
                .toList()
        }
        val originalAlternative = transaction(database) {
            PrerequisiteCsvConditionsTable.selectAll()
                .where {
                    (PrerequisiteCsvConditionsTable.courseId eq alternativeCourseId) and
                        (PrerequisiteCsvConditionsTable.relationshipType eq "prereq")
                }
                .single()[PrerequisiteCsvConditionsTable.originalText]
        }
        assertEquals(targetId, courseId("TST 999"))
        assertEquals(1, countCourse("TST 999"))
        assertEquals(
            setOf(
                prerequisiteId to "prereq",
                alternativeId to "prereq",
                prerequisiteId to "coreq"
            ),
            targetEdges.toSet()
        )
        assertTrue(alternativeEdges.isEmpty(), "OR alternatives must not become mandatory edges")
        assertEquals("TST 998 or TST 997", originalAlternative)
        assertEquals(1, countSourceEdge(targetId, prerequisiteId, "prereq", "cmpe_prereq.csv"))
        assertEquals(1, countSourceEdge(targetId, prerequisiteId, "coreq", "swe_prereq.csv"))
        assertTrue(alternativeId > 0)
        assertEquals(2, firstImport.courseRecordsCreated)
        assertEquals(0, secondImport.courseRecordsCreated)
        assertTrue(firstImport.warnings.any { it.contains("alternative or complex expression") })
        assertFalse(firstImport.unresolvedCourseCodes.contains("TST 998"))
    }

    @Test
    fun `reports unresolved prerequisite course codes without creating placeholder rows`() {
        insertCourse("TST 998", "Existing prerequisite")
        val input = ParsedPrerequisiteCsv(
            "cmpe_prereq.csv",
            listOf(row("TST 999", "Shared course", "TST 998 and TST 995", "")),
            emptyList()
        )

        val result = repository.importFiles(listOf(input))
        repository.importFiles(
            listOf(
                ParsedPrerequisiteCsv(
                    "cmpe_prereq.csv",
                    emptyList(),
                    listOf("cmpe_prereq.csv: no valid rows"),
                    rowsRead = 1
                )
            )
        )

        assertTrue(result.unresolvedCourseCodes.contains("TST 995"))
        assertEquals(0, countCourse("TST 995"))
        assertEquals(1, countSourceEdge(courseId("TST 999"), courseId("TST 998"), "prereq", "cmpe_prereq.csv"))
        assertEquals(1, countBaseEdge(courseId("TST 999"), courseId("TST 998"), "prereq"))
    }

    @Test
    fun `database failure rolls back courses and prerequisite changes together`() {
        val oversizedSourceKey = "x".repeat(101)
        val input = ParsedPrerequisiteCsv(
            oversizedSourceKey,
            listOf(row("TST 999", "Shared course", "", "")),
            emptyList()
        )

        assertThrows<Exception> { repository.importFiles(listOf(input)) }

        assertEquals(0, countCourse("TST 999"))
        assertEquals(
            0,
            transaction(database) {
                PrerequisiteCsvConditionsTable.selectAll().count {
                    it[PrerequisiteCsvConditionsTable.sourceKey] == oversizedSourceKey
                }
            }
        )
    }

    @Test
    fun `blank CSV metadata does not overwrite existing course title or official URL`() {
        val courseId = insertCourse(
            "TST 999",
            "Existing authoritative title",
            "https://catalog.sjsu.edu/existing-course"
        )
        val input = ParsedPrerequisiteCsv(
            "cmpe_prereq.csv",
            listOf(
                row("TST 999", "", "", "").copy(officialCourseUrl = "")
            ),
            emptyList()
        )

        repository.importFiles(listOf(input))

        val existingCourse = transaction(database) {
            CoursesTable.selectAll()
                .where { CoursesTable.id eq courseId }
                .single()
        }
        assertEquals("Existing authoritative title", existingCourse[CoursesTable.courseTitle])
        assertEquals("https://catalog.sjsu.edu/existing-course", existingCourse[CoursesTable.officialCatalogUrl])
    }

    @Test
    fun `roadmap exposes prerequisite courses without adding them to degree requirements`() {
        val targetId = insertCourse("TST 999", "Major course")
        val prerequisiteId = insertCourse("TST 998", "Prerequisite outside major")
        val majorId = transaction(database) {
            MajorsTable.insert { statement ->
                statement[majorName] = "TST importer integration"
                statement[department] = "TST"
                statement[totalUnits] = 3
            } get MajorsTable.id
        }
        val requirementId = transaction(database) {
            DegreeRequirementsTable.insert { statement ->
                statement[DegreeRequirementsTable.majorId] = majorId
                statement[categoryName] = "Required courses"
                statement[requiredUnits] = 3
            } get DegreeRequirementsTable.id
        }
        transaction(database) {
            RequirementCoursesTable.insert { statement ->
                statement[RequirementCoursesTable.requirementId] = requirementId
                statement[RequirementCoursesTable.courseId] = targetId
            }
            PrerequisitesTable.insert { statement ->
                statement[PrerequisitesTable.courseId] = targetId
                statement[PrerequisitesTable.prereqCourseId] = prerequisiteId
                statement[PrerequisitesTable.prereqType] = "prereq"
            }
        }

        val roadmap = RoadmapService(RoadmapRepository(database)).getRoadmap(majorId)

        assertTrue(roadmap.courses.any { it.courseId == prerequisiteId })
        assertTrue(roadmap.courses.single { it.courseId == prerequisiteId }.requirementIds.isEmpty())
        assertEquals(3, roadmap.major.totalRequiredUnits)
        assertEquals(listOf(targetId), roadmap.degreeRequirements.single().courseIds)
        assertEquals(listOf(targetId), roadmap.semesters.flatMap { it.courses }.map { it.courseId })
        assertEquals(prerequisiteId, roadmap.prerequisites.single().prereqCourseId)
    }

    private fun row(code: String, title: String, prerequisites: String, corequisites: String) =
        PrerequisiteCsvRow(
            rowNumber = 2,
            courseCode = code,
            courseTitle = title,
            prerequisites = prerequisites,
            corequisites = corequisites,
            officialCourseUrl = "https://catalog.sjsu.edu/preview_course_nopop.php?catoid=23&coid=1"
        )

    private fun insertCourse(code: String, title: String, officialUrl: String? = null): Int = transaction(database) {
        CoursesTable.insert { statement ->
            statement[courseCode] = code
            statement[courseTitle] = title
            statement[units] = 3
            statement[department] = code.substringBefore(' ')
            statement[officialCatalogUrl] = officialUrl
        } get CoursesTable.id
    }

    private fun courseId(code: String): Int = transaction(database) {
        CoursesTable.selectAll()
            .where { CoursesTable.courseCode eq code }
            .single()[CoursesTable.id]
    }

    private fun countCourse(code: String): Int = transaction(database) {
        CoursesTable.selectAll().count { it[CoursesTable.courseCode] == code }
    }

    private fun countSourceEdge(courseId: Int, prereqId: Int, type: String, source: String): Int =
        transaction(database) {
            PrerequisiteCsvEdgesTable.selectAll().count {
                it[PrerequisiteCsvEdgesTable.courseId] == courseId &&
                    it[PrerequisiteCsvEdgesTable.prereqCourseId] == prereqId &&
                    it[PrerequisiteCsvEdgesTable.relationshipType] == type &&
                    it[PrerequisiteCsvEdgesTable.sourceKey] == source
            }
        }

    private fun countBaseEdge(courseId: Int, prereqId: Int, type: String): Int =
        transaction(database) {
            PrerequisitesTable.selectAll().count {
                it[PrerequisitesTable.courseId] == courseId &&
                    it[PrerequisitesTable.prereqCourseId] == prereqId &&
                    it[PrerequisitesTable.prereqType] == type
            }
        }
}
