package edu.sjsu.courseplanner.backend

import java.sql.Connection
import javax.sql.DataSource
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
            "COURSES",
            "COURSE_OFFERINGS",
            "DEGREE_REQUIREMENTS",
            "INSTRUCTORS",
            "MAJORS",
            "PREREQUISITES",
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
