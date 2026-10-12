package edu.sjsu.courseplanner.backend

import edu.sjsu.courseplanner.backend.repository.CoursesTable
import edu.sjsu.courseplanner.backend.repository.PrerequisitesTable
import edu.sjsu.courseplanner.backend.service.PrerequisiteCsvImportService
import javax.sql.DataSource
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.annotation.DirtiesContext

@SpringBootTest(
    properties = [
        "spring.datasource.url=jdbc:h2:mem:prerequisite-files-test;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
    ]
)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PrerequisiteCsvFilesImportTest {
    @Autowired
    private lateinit var importService: PrerequisiteCsvImportService

    @Autowired
    private lateinit var database: org.jetbrains.exposed.v1.jdbc.Database

    @Autowired
    private lateinit var dataSource: DataSource

    @Test
    fun `imports the actual CMPE and SWE files separately and together idempotently`() {
        val cmpe = importService.import("cmpe")
        val swe = importService.import("swe")
        val both = importService.import("all")
        val courseCount = transaction(database) { CoursesTable.selectAll().count() }
        val prerequisiteCount = transaction(database) { PrerequisitesTable.selectAll().count() }
        val invalidForeignKeys = dataSource.connection.use { connection ->
            connection.createStatement().use { statement ->
                statement.executeQuery(
                    """
                    SELECT COUNT(*) FROM prerequisites p
                    LEFT JOIN courses c ON c.course_id = p.course_id
                    LEFT JOIN courses r ON r.course_id = p.prereq_course_id
                    WHERE c.course_id IS NULL OR r.course_id IS NULL
                    """.trimIndent()
                ).use { result ->
                    result.next()
                    result.getInt(1)
                }
            }
        }

        println("CMPE prerequisite import: $cmpe")
        println("SWE prerequisite import: $swe")
        println("Combined prerequisite import: $both")
        assertEquals(29, cmpe.rowsRead)
        assertEquals(35, swe.rowsRead)
        assertEquals(64, both.rowsRead)
        assertTrue(cmpe.courseRecordsCreated > 0)
        assertTrue(swe.courseRecordsMatched > 0, "SWE should reuse shared CMPE course records")
        assertEquals(0, both.courseRecordsCreated, "Reimporting both files must not create duplicates")
        assertTrue(courseCount > 0)
        assertTrue(prerequisiteCount > 0)
        assertEquals(0, invalidForeignKeys)
    }
}
