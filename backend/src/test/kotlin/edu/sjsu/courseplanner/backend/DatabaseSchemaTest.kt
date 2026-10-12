package edu.sjsu.courseplanner.backend

import java.sql.Connection
import javax.sql.DataSource
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class DatabaseSchemaTest {

    @Autowired
    private lateinit var dataSource: DataSource

    @Test
    fun `schema initializer creates all planner tables`() {
        val expectedTables = setOf(
            "ANNOUNCEMENTS",
            "COURSES",
            "COURSE_OFFERINGS",
            "DEGREE_REQUIREMENTS",
            "INSTRUCTORS",
            "MAJORS",
            "PREREQUISITES",
            "PREREQUISITE_CSV_CONDITIONS",
            "PREREQUISITE_CSV_EDGES",
            "REQUIREMENT_COURSES",
            "SECTIONS",
            "SEMESTERS",
            "SEMESTER_COURSES",
            "STUDENTS",
            "STUDENT_HISTORY",
            "STUDENT_ROADMAPS"
        )

        dataSource.connection.use { connection ->
            val actualTables = existingTables(connection)
            expectedTables.forEach { tableName ->
                assertTrue(
                    actualTables.contains(tableName),
                    "Expected table $tableName to exist, but found: $actualTables"
                )
            }
        }

        @Test
        fun `prerequisite key permits separate prerequisite and corequisite edges`() {
            dataSource.connection.use { connection ->
                connection.metaData.getPrimaryKeys(connection.catalog, null, "PREREQUISITES").use { keys ->
                    val columns = mutableSetOf<String>()
                    while (keys.next()) {
                        columns += keys.getString("COLUMN_NAME").lowercase()
                    }
                    assertEquals(setOf("course_id", "prereq_course_id", "prereq_type"), columns)
                }
            }
        }
    }

    private fun existingTables(connection: Connection): Set<String> {
        connection.metaData.getTables(null, null, "%", arrayOf("TABLE")).use { resultSet ->
            val names = mutableSetOf<String>()
            while (resultSet.next()) {
                names += resultSet.getString("TABLE_NAME").uppercase()
            }
            return names
        }
    }
}
